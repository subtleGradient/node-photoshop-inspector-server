// Forked from https://github.com/c4milo/node-webkit-agent
/*
Copyright 2013 Thomas Aylott. All rights reserved.
Copyright 2012 Camilo Aguilar. All rights reserved.

(The MIT License)
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var ID = 'node-photoshop-inspector-server'
var WebSocketServer = require('ws').Server

var PORT = 9074
var HOST = '127.0.0.1'
function noop(){}


exports.start = function(config) {
  var agent = { wss:null, stop:null, config:config }
  
  if (config == null) config = {}
  if (config.port == null) config.port = process.env.INSPECT_PORT || PORT
  if (config.host == null) config.host = process.env.INSPECT_HOST || HOST
  if (typeof config.debug != 'function') config.debug = noop
  if (!(config.agents && typeof config.agents == 'object')) throw Error("expected config.agents")
  
  agent.wss = new WebSocketServer(config)
  agent.stop = function() {
    if (!agent.wss) return
    agent.wss.close()
    console.warn(ID + ' stopped')
  }

  config.debug(ID + ' started on %s:%s connect any tool that speaks the WebKit Inspector Protocol over websockets.', config.host, config.port)
  config.debug('Available APIs', config.agents)

  agent.wss.on('connection', function(socket) {
    
    socket.sendObject = function(object){
      this.send(JSON.stringify(object))
      if (config.onsend) config.onsend(object)
    }
    
    var parseErrorResponse = {"error": {"code": -32700, "message": "Parse error"}, "id": null}
    var sendParseError = socket.sendObject.bind(socket, parseErrorResponse)
    var sendEvent = socket.sendObject.bind(socket)
    
    socket.on('message', function(message) {
      try { message = JSON.parse(message) }
      catch (e) { sendParseError(); console.error(e.stack) }
      if (config.onmessage) config.onmessage(message)
      if (typeof message == 'string') return
      
      var id = message.id
      var command = message.method.split('.')
      var domainName = command[0]
      var domain = config.agents[domainName]
      var methodName = command[1]
      var params = message.params
      
      if (!(domain && typeof domain[methodName] == 'function')) {
        socket.sendObject({"error": {"code": -32601, "message": "Method not found"}, "id": id})
        return
      }
      
      config.debug("executing method", command, params)
      domain[methodName](params, function(error, result){
        if (error) socket.sendObject({ id: id, error: {code:-32000, message:error, data:result} })
        else socket.sendObject({ id: id, result: result })
      }, sendEvent)
    })
  })
  
  return agent
}

if (!module.parent) exports.start()


process.on('uncaughtException', function (err) {
    console.error(ID + ': uncaughtException: ')
    console.error(err.stack)
})


#!/usr/bin/env node
/*jshint asi:true*/

exports.Agent = require('./lib/webkit-devtools-agent')

if (module.id == '.') (function(){
  
  var ANSi = require('ansi')
  var cursor = ANSi(process.stdout)
  console.log('Testing')
  
  var api = require('./lib/api').apiFromSpec(require('./lib/Inspector'))
  
  var agents = {
    DOM: require('./lib/generated/dom')
  }
  
  // Object.keys(api).forEach(function(name){
  //   console.log('\n\n'+name, JSON.stringify(api[name]))
  // })
  // console.log('\n\n')
  
  var _requests = {}
  var BLACKLIST = {'DOM.highlightNode':true, 'DOM.hideHighlight':true}
  
  var config = {
    
    debug: function(){
      console.warn.apply(console, arguments)
    },
    
    onsend: function(message){
      var request = message.id ? _requests[message.id] : _requests
      
      if (request) if (!BLACKLIST[request.method]){
        cursor
          .write('[\t')
        
          .white()
          .bg.blue()
            .write(JSON.stringify(request))
          .bg.reset()
          .reset()
        
          .write(',\t')
        
          .blue()
            .write(JSON.stringify(api[request.method].description || api[request.method]))
          .reset()
        
          .write('\n,\t')
        
          [message.error ? 'red' : 'green']()
            .write(JSON.stringify(message))
          .reset()
          .write('\n')
      
        if (api[request.method].returns)
          cursor
            .write(',\t')
            .blue()
              .write(JSON.stringify(api[request.method].returns))
            .reset()
            .write('\n')
      
        cursor
          .write(']')
          .write('\n')
      }
      
      if (message.id) delete _requests[message.id]
      else for (var id in _requests) delete _requests[id]
    },
    
    onmessage: function(message){
      _requests[message.id] = message
    },
    
    agents: agents,
  }
  
  var agent = exports.Agent.start(config)
  // agent.stop()
  
}())

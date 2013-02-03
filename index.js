#!/usr/bin/env node
/*jshint asi:true*/

exports.Agent = require('./lib/webkit-devtools-agent')

if (module.id == '.') (function(){
  
  var ANSi = require('ansi')
  var cursor = ANSi(process.stdout)
  console.log('Testing')
  
  var api = require('./lib/api').apiFromDescriptor(require('./lib/Inspector'))
  
  console.log(JSON.stringify(api, null, 2))
  
  var _requests = {}
  
  var config = {
    
    debug: function(){
      console.warn.apply(console, arguments)
    },
    
    onsend: function(message){
      var request = message.id ? _requests[message.id] : _requests
      
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
        
        [message.error ? 'red' : 'black']()
          .write(JSON.stringify(message))
        .reset()
      
      if (api[request.method].returns)
        cursor
          .write('\n,\t')
          .blue()
            .write(JSON.stringify(api[request.method].returns))
          .reset()
          .write('\n')
      
      cursor
        .write('\n]')
        .write('\n')
      
      if (message.id) delete _requests[message.id]
      else for (var id in _requests) delete _requests[id]
    },
    
    onmessage: function(message){
      _requests[message.id] = message
    },
    
    agents: {
      
    },
  }
  
  var agent = exports.Agent.start(config)
  // agent.stop()
  
}())

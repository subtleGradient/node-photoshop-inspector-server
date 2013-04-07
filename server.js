var ANSi = require('ansi')
var cursor = ANSi(process.stdout)
console.log('Testing')

var api = require('./lib/api').apiFromSpec(require('./lib/Inspector'))

var agents = new(require('./lib/wip-ps').Everything)()


// Object.keys(api).forEach(function(name){
//   console.log('\n\n'+name, JSON.stringify(api[name]))
// })
// console.log('\n\n')
var _requests = {}
var BLACKLIST = {
  'DOM.highlightNode': true,
  'DOM.hideHighlight': true
}

var config = {

  debug: function() {
    console.warn.apply(console, arguments)
  },

  onfire: function(event) {
    cursor.write('\t').yellow().bg.black().write(JSON.stringify(event)).bg.reset().reset().write('\n')
  },

  onsend: function(message) {
    var request = message.id ? _requests[message.id] : _requests
    message.request = request

    if (!(request && request.method && api[request.method])) {
      console.warn(request)
    }
    else if (!BLACKLIST[request.method]) {
      cursor.write('[\t')

      // .white()
      // .bg.blue()
      //   .write(JSON.stringify(request))
      // .bg.reset()
      // .reset()
      //         
      // .write(',\t')
      //         
      .blue().write(JSON.stringify(api[request.method] && api[request.method].description || api[request.method] || request.method)).reset()

      .write('\n,\t')

      [message.error ? 'red' : 'green']().write(JSON.stringify(message)).reset().write('\n')

      if (api[request.method].returns) cursor.write(',\t').blue().write(JSON.stringify(api[request.method].returns)).reset().write('\n')

      cursor.write(']').write('\n')
    }

    if (message.id) delete _requests[message.id]
    else for (var id in _requests) delete _requests[id]
  },

  onmessage: function(request) {
    _requests[request.id] = request
    if (!BLACKLIST[request.method]) cursor.write(',\t').white().bg.blue().write(JSON.stringify(request)).bg.reset().reset().write(',\n')
  },

  agents: agents,
}

config.port = process.env['photoshop-inspector-server_config_port'] || process.argv[2]

var agent = require('./lib/webkit-devtools-agent').start(config)

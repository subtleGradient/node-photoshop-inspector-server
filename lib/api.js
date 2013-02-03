
exports.apiFromSpec = function(descriptor){
  var api = {}
  descriptor.domains.forEach(function(domain){
    // api[domain.domain] = {descriptor:domain}
    
    domain.types && domain.types.forEach(function(type){
      // type.version = descriptor.version
      if (domain.hidden) type.hidden = true
      api[domain.domain +'.'+ (type.name || type.id)] = type
    })
    
    domain.commands && domain.commands.forEach(function(command){
      // command.version = descriptor.version
      if (domain.hidden) command.hidden = true
      api[domain.domain +'.'+ (command.name || command.id)] = command
    })
    
    domain.events && domain.events.forEach(function(event){
      // event.version = descriptor.version
      if (domain.hidden) event.hidden = true
      api[domain.domain +'.'+ (event.name || event.id)] = event
    })
    
    
  })
  
  function parseArg(arg) {
    if (arg.$ref) arg.type = api[arg.$ref] || api[this + '.' + arg.$ref]
  }
  
  // Object.keys(api).forEach(function(apiName){
  //   var domain = apiName.split('.')[0]
  //   var apiItem = api[apiName]
  //   if (apiItem.returns) apiItem.returns.forEach(parseArg, domain)
  //   if (apiItem.parameters) apiItem.parameters.forEach(parseArg, domain)
  //   if (apiItem.properties) apiItem.properties.forEach(parseArg, domain)
  // })
  
  return api
}

if (!module.parent) (function(){
  
  console.log(exports.apiFromSpec(require('./Inspector'))['LayerTree.nodeIdForLayerId'])
  
}())

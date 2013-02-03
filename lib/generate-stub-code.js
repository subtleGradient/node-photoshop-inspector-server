// take the Inspector.json file and convert it into code
// http://trac.webkit.org/export/141683/trunk/Source/WebCore/inspector/Inspector.json

exports.astFromDescriptor = function(descriptor){
  descriptor.domains.map(astFromDomain)
}

function astFromDomain(domain){
  console.log(Object.keys(domain))
}


if (module.id == '.') (function(){
  
  exports.astFromDescriptor(require('./Inspector'))
  
}())

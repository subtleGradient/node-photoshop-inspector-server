// {"inlineStyle":{"cssProperties":[],"shorthandEntries":[],"styleId":{"styleSheetId":"1","ordinal":0},"width":"","height":"","range":{"start":0,"end":0},"cssText":""}}

var CSS = exports

CSS._setCacheObject = function(cache){
  
}

CSS._stringify = function(object){
  var css = ''
  Object.keys(object).forEach(function(key){
    var value = object[key]
    css += key
    css += ': '
    css += value
    if (typeof value == 'number' && unitForKey[key]) css += unitForKey[key]
    css += '; '
  })
  return css
}

var unitForKey = {}
'top right bottom left width height'.split(' ').forEach(function(key){unitForKey[key] = 'px'})

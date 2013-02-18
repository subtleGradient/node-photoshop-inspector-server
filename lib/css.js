// {"inlineStyle":{"cssProperties":[],"shorthandEntries":[],"styleId":{"styleSheetId":"1","ordinal":0},"width":"","height":"","range":{"start":0,"end":0},"cssText":""}}

var CSS = exports

CSS._setCacheObject = function(cache){
  
}

CSS._layerColorToCSSColor = function(value){
  return 'rgb(' + Math.round(value.red) +',' + Math.round(value.green||value.grain) +',' + Math.round(value.blue) +')'
}

CSS._stringify = function(object){
  if (typeof object != 'object') return object;
  var css = ''
  Object.keys(object).forEach(function(key){
    var value = object[key]
    css += key
    css += ': '
    if (typeof value == 'object'){
      if (key == 'color') {
        css += CSS._layerColorToCSSColor(value)
      }
      else {
        css += JSON.stringify(value)
      }
    }
    else {
      css += value
      if (typeof value == 'number' && unitForKey[key]) css += unitForKey[key]
    }
    css += '; '
  })
  return css
}

var unitForKey = {}
'top right bottom left width height'.split(' ').forEach(function(key){unitForKey[key] = 'px'})

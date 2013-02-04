var PSFakeDOM = typeof exports == 'object' ? exports : {}

PSFakeDOM.activeDocument_getLayerCount = function() {
  var ref = new ActionReference
  ref.putProperty(app.charIDToTypeID("Prpr"), app.charIDToTypeID("NmbL"))
  ref.putEnumerated(app.charIDToTypeID("Dcmn"), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"))
  return executeActionGet(ref).getInteger(app.charIDToTypeID("NmbL"))
}

PSFakeDOM.activeDocument_hasBackground = function(){try{activeDocument.backgroundLayer;return true}catch(e){return false}}

PSFakeDOM.getLayerActionDescriptors = function(){
  var ref
  var layerCount = PSFakeDOM.activeDocument_getLayerCount() + Number(!PSFakeDOM.activeDocument_hasBackground())
  var index = layerCount
  var layers = Array(index)
  
  while (index-- > 0){
    ref = new ActionReference
    ref.putIndex(app.charIDToTypeID("Lyr "), index)
    try {layers[index] = executeActionGet(ref)}
    catch(e){layers[index] = null}
  }
  return layers
}

PSFakeDOM.getDocumentNode = function(){
  var doc = app.activeDocument
  var docObj = {
    layerId: -1,
    type: 'document',
    name: doc.name,
    path: decodeURIComponent(doc.fullName.path),
    bounds: {
      left: 0,
      top: 0,
      width: doc.width.as('px'),
      height: doc.height.as('px'),
    },
    children: PSFakeDOM.getLayerActionDescriptors(),
  }
  docObj.bounds.right = docObj.bounds.width
  docObj.bounds.bottom = docObj.bounds.height
  return docObj
}

PSFakeDOM.openFileAtPath = function(path){
  path = new File(path)
  if (!path.exists) throw Error("doesn't exist: '" + path + "'");
  
  var desc = new ActionDescriptor
  desc.putPath(charIDToTypeID("null"), path)
  return executeAction(charIDToTypeID("Opn "), desc, DialogModes.NO)
}

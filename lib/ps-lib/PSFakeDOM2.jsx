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
  var layers = []
  
  while (index-- > 0){
    ref = new ActionReference
    ref.putIndex(app.charIDToTypeID("Lyr "), index)
    try {layers.push(executeActionGet(ref))}
    catch(e){}
  }
  return layers
}

PSFakeDOM.invokeToJSON = function(layer){ return layer.toJSON() }

PSFakeDOM.layers_populateChildLayerIDs = function(layers, root){
  var layersByID = {}, parentID
  if (root == null) root = {layerID:-1, _childLayerIDs:[]}
  parentID = root.layerID
  layersByID[parentID] = root
  
  layers.filter(Boolean).forEach(function(layer, index){
    // Close Layer Group
    // if (layer.name == '</Layer group>'){
    if (layer.layerSection == 'layerSectionEnd'){
      layer._groupEnd = true
      parentID = layersByID[parentID]._parentID
      return
    }
    // Normal Layer
    layersByID[layer.layerID] = layer
    layer._parentID = parentID
    if (!layersByID[parentID]._childLayerIDs) layersByID[parentID]._childLayerIDs = []
    layersByID[parentID]._childLayerIDs.push(layer.layerID)
    
    // Layer Group
    if (layer.layerSection == 'layerSectionStart'){
      parentID = layer.layerID
    }
  })
  return layersByID
}

PSFakeDOM.requestChildNodes = function(layerID, depth){
  if (depth == null) depth = 1
  var children
  // TODO: Add support for more depths
  var layersByID = PSFakeDOM.getLayers()
  children = layersByID[layerID]._childLayerIDs.map(function(layerID){
    return layersByID[layerID]
  })
  return children
}

// "name": "requestChildNodes",
// "parameters": [
//     { "name": "nodeId", "$ref": "NodeId", "description": "Id of the node to get children for." },
//     { "name": "depth", "type": "integer", "optional": true, "description": "The maximum depth at which children should be retrieved, defaults to 1. Use -1 for the entire subtree or provide an integer larger than 0." }
// ],

PSFakeDOM.LayerKeyWhitelist = {
  _parentID:1,
  _childLayerIDs:1,
  
  background:0,
  bounds:1,
  channelRestrictions:0,
  color:0,
  count:0,
  fillOpacity:0,
  globalAngle:0,
  group:0,
  hasFilterMask:1,
  hasUserMask:1,
  hasVectorMask:1,
  itemIndex:0,
  layerFXVisible:0,
  layerID:1,
  layerLocking:0,
  layerSection:1,
  mode:0,
  name:1,
  opacity:1,
  preserveTransparency:0,
  targetChannels:0,
  useAlignedRendering:0,
  userMaskDensity:0,
  userMaskFeather:0,
  vectorMaskDensity:0,
  vectorMaskFeather:0,
  visible:1,
  visibleChannels:0,
}


PSFakeDOM.getLayers = function(LayerKeyWhitelist){
  if (LayerKeyWhitelist == null) LayerKeyWhitelist = PSFakeDOM.LayerKeyWhitelist
  return PSFakeDOM.layers_populateChildLayerIDs(
    PSFakeDOM.getLayerActionDescriptors().map(PSFakeDOM.invokeToJSON).map(function(layer){
      var flatLayer = {}
      for (var key in layer) {
        if (!LayerKeyWhitelist[key]) continue;
        var value = layer[key]
        flatLayer[key] = value
      }
      return flatLayer
    })
  )
}

PSFakeDOM.getDocumentNode = function(){
  var doc = app.activeDocument
  var docObj = {
    layerId: -1,
    type: 'document',
    name: doc.name,
    path: decodeURIComponent(doc.fullName),
    bounds: {
      left: 0,
      top: 0,
      width: doc.width.as('px'),
      height: doc.height.as('px'),
    },
    children: PSFakeDOM.requestChildNodes(-1, 1),
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


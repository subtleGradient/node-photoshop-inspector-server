var PSFakeDOM = typeof exports == 'object' ? exports : {}

PSFakeDOM.getLayerCount = function() {
  var ref = new ActionReference
  ref.putProperty(app.charIDToTypeID("Prpr"), app.charIDToTypeID("NmbL"))
  ref.putEnumerated(app.charIDToTypeID("Dcmn"), app.charIDToTypeID("Ordn"), app.charIDToTypeID("Trgt"))
  return executeActionGet(ref).getInteger(app.charIDToTypeID("NmbL")) + 1
}

PSFakeDOM.hasBackground = function(){try{activeDocument.backgroundLayer;return true}catch(e){return false}}

PSFakeDOM.getLayerActionDescriptors = function(){
  var ref
  var layerCount = PSFakeDOM.getLayerCount()
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

PSFakeDOM.layerRefToLayerDescriptor = app.executeActionGet

PSFakeDOM.invokeToJSON = function(layer){ return layer.toJSON() }

PSFakeDOM.layers_populateChildLayerIDs = function(layers, root){
  var layersByID = {}, parentId
  if (root == null) root = {layerID:-1, _childLayerIDs:[]}
  parentId = root.layerID
  layersByID[parentId] = root
  
  layers.filter(Boolean).forEach(function(layer, index){
    // Close Layer Group
    // if (layer.name == '</Layer group>'){
    if (layer.layerSection == 'layerSectionEnd'){
      layer._groupEnd = true
      parentId = layersByID[parentId]._parentId
      return
    }
    // Normal Layer
    layersByID[layer.layerID] = layer
    layer._parentId = parentId
    if (!layersByID[parentId]._childLayerIDs) layersByID[parentId]._childLayerIDs = []
    layersByID[parentId]._childLayerIDs.push(layer.layerID)
    
    // Layer Group
    if (layer.layerSection == 'layerSectionStart'){
      parentId = layer.layerID
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

PSFakeDOM.LayerKeyWhitelist = {
  _parentId:1,
  _childLayerIDs:1,
  
  visibleChannels:0,
  vectorMaskFeather:0,
  vectorMaskDensity:0,
  userMaskFeather:0,
  userMaskDensity:0,
  useAlignedRendering:0,
  targetChannels:0,
  preserveTransparency:0,
  mode:0,
  layerLocking:0,
  itemIndex:0,
  group:0,
  globalAngle:0,
  fillOpacity:0,
  count:0,
  color:0,
  channelRestrictions:0,
  background:0,
  adjustment:0,
  
  layerID:1,
  name:1,
  
  textKey:1,
  smartObject:1,
  bounds:1,
  layerSection:1,
  visible:1,
  opacity:1,
  layerFXVisible:1,
  layerEffects:1,
  hasFilterMask:1,
  hasUserMask:1,
  hasVectorMask:1,
}

PSFakeDOM.LayerKeyBlacklist = {}

PSFakeDOM.getLayers = function(LayerKeyWhitelist){
  if (LayerKeyWhitelist == null) LayerKeyWhitelist = PSFakeDOM.LayerKeyWhitelist
  var layers = PSFakeDOM.layers_populateChildLayerIDs(
    PSFakeDOM.getLayerActionDescriptors().map(PSFakeDOM.invokeToJSON).map(function(layer){
      var flatLayer = {}
      for (var key in layer) {
        if (!LayerKeyWhitelist[key]) {
          if (PSFakeDOM.debug) PSFakeDOM.LayerKeyBlacklist[key] = layer[key]
          continue;
        }
        var value = layer[key]
        flatLayer[key] = value
      }
      return flatLayer
    })
  )
  return layers
}

PSFakeDOM.getDocumentNode = function(){
  var doc = app.activeDocument
  var docObj = {
    layerId: -1,
    type: 'document',
    bounds: {
      left: 0,
      top: 0,
      width: doc.width.as('px'),
      height: doc.height.as('px'),
    },
    children: PSFakeDOM.requestChildNodes(-1, 1),
  }
  try { docObj.name = doc.name } catch(e){ docObj.name = 'Untitled' }
  try { docObj.path = decodeURIComponent(doc.fullName) } catch(e){ docObj.path = '/tmp/Untitled.psd' }
  
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

PSFakeDOM.getLayerRefById = function(layerID){ var ref = new ActionReference; ref.putIdentifier(app.charIDToTypeID("Lyr "), layerID); return ref }
PSFakeDOM.getLayerRefByName = function(layerName){ var ref = new ActionReference; ref.putName(app.charIDToTypeID("Lyr "), layerName); return ref }
PSFakeDOM.getLayerRefByIndex = function(layerIndex){ var ref = new ActionReference; ref.putIndex(app.charIDToTypeID("Lyr "), layerIndex); return ref }

PSFakeDOM.selectLayerByRef = function(layerRef){
  var idslct = charIDToTypeID( "slct" );
      var desc104 = new ActionDescriptor();
      var idnull = charIDToTypeID( "null" );
      desc104.putReference( idnull, layerRef );
      var idMkVs = charIDToTypeID( "MkVs" );
      desc104.putBoolean( idMkVs, false );
  executeAction( idslct, desc104, DialogModes.NO );
}


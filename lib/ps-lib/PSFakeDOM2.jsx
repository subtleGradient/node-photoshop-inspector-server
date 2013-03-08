var PSFakeDOM = typeof exports == 'object' ? exports : {}

PSFakeDOM.getLayerCount = function getLayerCount() {
	var ref = new ActionReference;
	ref.putProperty(stringIDToTypeID("property"), stringIDToTypeID("numberOfLayers"));
	ref.putEnumerated(stringIDToTypeID("document"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));
  return executeActionGet(ref).getInteger(stringIDToTypeID("numberOfLayers")) + 1
}

PSFakeDOM.hasBackground = function hasBackground(){try{activeDocument.backgroundLayer;return true}catch(e){return false}}

PSFakeDOM.getLayerActionDescriptors = function getLayerActionDescriptors(){
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

PSFakeDOM.invokeToJSON = function invokeToJSON(layer){ return layer.toJSON() }

PSFakeDOM.layers_populateChildLayerIDs = function layers_populateChildLayerIDs(layers, root){
  var layersByID = {}, parentId
  if (root == null) root = {layerID:-1, _childLayerIDs:[], _childCount:0, _jsPath:'app.activeDocument', _namePath:[app.activeDocument.name]}
  parentId = root.layerID
  childIndex = 0
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
    layer._childIndex = layersByID[parentId]._childCount++
    layer._namePath = layersByID[parentId]._namePath.concat(layer.name)
    layer._jsPath = layersByID[parentId]._jsPath + '.layers[' + layer._childIndex + ']'
    if (!layersByID[parentId]._childLayerIDs) layersByID[parentId]._childLayerIDs = []
    layersByID[parentId]._childLayerIDs.push(layer.layerID)
    
    // Layer Group
    if (layer.layerSection == 'layerSectionStart'){
      layer._childCount = 0
      parentId = layer.layerID
    }
  })
  return layersByID
}

PSFakeDOM.requestChildNodes = function requestChildNodes(layerID, depth){
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
  adjustment:1,
}

PSFakeDOM.LayerKeyBlacklist = {}

PSFakeDOM._cache = null

PSFakeDOM.getLayers = function getLayers(LayerKeyWhitelist){
  if (PSFakeDOM._cache) return PSFakeDOM._cache;
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
  return PSFakeDOM._cache = layers
}

PSFakeDOM.getLayersArray = function(){
  var layers = PSFakeDOM.getLayers()
  return Object.keys(layers).map(function(id){ return layers[id] })
}

PSFakeDOM.getDocumentNode = function getDocumentNode(){
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

PSFakeDOM.openFileAtPath = function openFileAtPath(path){
  path = new File(path)
  if (!path.exists) throw Error("doesn't exist: '" + path + "'");
  
  var desc = new ActionDescriptor
  desc.putPath(charIDToTypeID("null"), path)
  return executeAction(charIDToTypeID("Opn "), desc, DialogModes.NO)
}

PSFakeDOM.getLayerRefById = function getLayerRefById(layerID){ var ref = new ActionReference; ref.putIdentifier(app.charIDToTypeID("Lyr "), layerID); return ref }
PSFakeDOM.getLayerRefByName = function getLayerRefByName(layerName){ var ref = new ActionReference; ref.putName(app.charIDToTypeID("Lyr "), layerName); return ref }
PSFakeDOM.getLayerRefByIndex = function getLayerRefByIndex(layerIndex){ var ref = new ActionReference; ref.putIndex(app.charIDToTypeID("Lyr "), layerIndex); return ref }

PSFakeDOM.selectLayerByRef = function selectLayerByRef(layerRef){
  var idslct = charIDToTypeID( "slct" );
      var desc104 = new ActionDescriptor();
      var idnull = charIDToTypeID( "null" );
      desc104.putReference( idnull, layerRef );
      var idMkVs = charIDToTypeID( "MkVs" );
      desc104.putBoolean( idMkVs, false );
  executeAction( idslct, desc104, DialogModes.NO );
}

PSFakeDOM.findUniqueStyles = function findUniqueStyles(){
  var styles = []
  var _uniqueStyles = {}
  var layers = PSFakeDOM.getLayerActionDescriptors().map(PSFakeDOM.invokeToJSON)
  
  layers.forEach(function(layer){
    var id = uniqueLayerStyleId(layer)
    if (!_uniqueStyles[id]){
      _uniqueStyles[id] = {layerIDs:[], layerEffects:layer.layerEffects, adjustment:layer.adjustment, opacity:layer.opacity}
      styles.push(_uniqueStyles[id])
    }
    _uniqueStyles[id].layerIDs.push(layer.layerID)
  })
  function uniqueLayerStyleId(layer){return JSON.stringify([layer.layerEffects, layer.adjustment, layer.opacity])}
  
  return styles
}

PSFakeDOM.populateValues = function(keys, ids){
  var layers = PSFakeDOM.getLayers()
  if (ids == null) ids = Object.keys(layers);
  var source = PSFakeDOM.generatePopulateValuesFunction(keys, ids)
  Function('layers', source)(layers)
  return layers
}

PSFakeDOM.generatePopulateValuesFunction = function(keys, ids){
  var layers = PSFakeDOM.getLayers()
  if (ids == null) ids = Object.keys(layers);
  if (!Array.isArray(keys)) keys = [keys]
  var source = keys.map(function(key){
    return ids.map(function(id){ return 'layers["' + id + '"][' + JSON.stringify(key) + '] = ' + layers[id]._jsPath +'.'+ key }).join(';\n')
  }).join('\n')
  return source + '\nreturn layers'
}

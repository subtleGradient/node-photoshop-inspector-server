/*jshint asi:true*/

exports.Everything = Everything
function Everything(config){
  this.config = config
  this.DOM = new DOMServer(this)
  this.Console = new ConsoleServer(this)
  this.Runtime = new RuntimeServer(this)
  this.photoshop = photoshop
}

////////////////////////////////////////////////////////////////////////////////

var CSS = require('./css')

var photoshop = require('./ps-lib/photoshop.node.js')
if (!module.parent) {
  photoshop.run(function(){
    return app.activeDocument
  }, function(error, result){
    console.log(error, result)
  })
}

var ps = {}

ps.layerTreeFromLayerList = function(layers){
  var tree = []
  layers/*.slice().reverse()*/.forEach(function(layer){
    // console.warn(layer.name)
    if (layer.name == '</Layer group>') {
      if (!tree.parent) throw Error('expected tree.parent')
      tree = tree.parent
      return;
    }
    
    tree.push(layer)
    
    if (layer.layerSection == 'layerSectionStart') {
      // console.warn('<Layer group>')
      layer.children = []
      layer.children.parent = tree
      tree = layer.children
    }
  })
  return tree
}

ps.documentToNode = function(document){
  var node = {
    "nodeId": document.layerID || document.id || -1, // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
    "nodeType": Node.DOCUMENT_NODE, // `Node`'s nodeType
    "nodeName": "#document", // `Node`'s nodeName
    "localName": "", // `Node`'s localName
    // "nodeValue": null, // `Node`'s nodeValue
    
  }
  try {
    node.documentURL = "file://" + document.path.split('/').map(encodeURIComponent).join('/').replace('~', process.env.HOME)
   //"optional": true, // Document URL that `Document` or `FrameOwner` node points to
  }
  catch(e){
    node.documentURL = "file:///tmp/Untitled.psd"
  }
  
  
  // "childNodeCount": document.children && document.children.length || 0, //, "optional": true, // Child count for `Container` nodes
  // "children": document.children.filter(Boolean).map(ps.layerToNode, document), //"optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
  
  node.children = document.children && document.children.map(ps.layerToNode).reverse()
  // node.children = ps.layerTreeFromLayerList(document.children.filter(Boolean).reverse()).map(ps.layerToNode, document)
  node.childNodeCount = node.children && node.children.length || 0
  
  node.baseURL = node.documentURL
  return node
}

ps.TEXT_NODE_ID = 0xF00D

ps.layerToNode = function(layer){
  if (!layer) return;
  
  var node = {
    "nodeId": layer.layerID, // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
    "nodeType": Node.ELEMENT_NODE, // `Node`'s nodeType
    "nodeName": "layer", // `Node`'s nodeName
    "localName": "layer", // `Node`'s localName
    // "nodeValue": null, // `Node`'s nodeValue
    
    "attributes":[],
  }
  
  if (layer.children && layer.children.length) node.children = layer.children.map(ps.layerToNode)
  node.childNodeCount = node.children && node.children.length || 0
  if (layer._childLayerIDs) node.childNodeCount = layer._childLayerIDs.length
  
  if (node.childNodeCount) {
    node.nodeName = node.localName = 'group'
  }
  
  // "attributes": Object_toKeyValueArray(layer), //"array", "optional": true, "items": { "type": "string" }, // Attributes of the `Element` node in the form of flat array `[name1, value1, name2, value2]`
    
  // "childNodeCount": "integer", "optional": true, // Child count for `Container` nodes
  // "children": "array", "optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
  // "documentURL": "string", "optional": true, // Document URL that `Document` or `FrameOwner` node points to
  // "baseURL": "string", "optional": true, // Base URL that `Document` or `FrameOwner` node uses for URL completion
  // "publicId": "string", "optional": true, // `DocumentType`'s publicId
  // "systemId": "string", "optional": true, // `DocumentType`'s systemId
  // "helperSubset": "string", "optional": true, // `DocumentType`'s helperSubset
  // "xmlVersion": "string", "optional": true, // `Document`'s XML version in case of XML documents
  // "name": "string", "optional": true, // `Attr`'s name
  // "value": "string", "optional": true, // `Attr`'s value
  // "frameId": "Network.FrameId", "optional": true, // Frame ID for frame owner elements
  // "contentDocument": "Node", "optional": true, // Content document for frame owner elements
  // "shadowRoots": "array", "optional": true, "items": { "$ref": "Node" }, // Shadow root list for given element host
  // "templateContent": "Node", "optional": true, // Content document fragment for template elements"
  
  var styleObj = {
    opacity: Math.round(layer.opacity / 0xFF * 100) / 100,
  }
  if (styleObj.opacity == 1) delete styleObj.opacity
  
  var attrObj = {
    id: layer.layerID,
    name: layer.name,
    // TODO: Move size & position to CSS for Layer Comp support
    // width: layer.bounds.width,
    // height: layer.bounds.height,
    // left: layer.bounds.left,
    // top: layer.bounds.top,
    // 'data-layer-keys': Object.keys(layer).join(' ')
  }
  
/*
  // FIXME: Layer depends on parent/document?
  if (node.localName == 'group') {
    delete attrObj.width
    delete attrObj.height
    styleObj = {
      clip: 'rect(' + [
        layer.bounds.top,
        document.bounds.width - layer.bounds.right,
        document.bounds.height - layer.bounds.bottom,
        layer.bounds.top,
      ].join('px ') + 'px)'
    }
  }
*/
  
  if (layer.smartObject) {
    node.nodeName = 'OBJECT'
    node.nodeName = node.localName = 'object'
    attrObj.data = layer.smartObject.fileReference
  }
  
  if (layer.textKey) {
    // console.log(layer)
    node.nodeName = 'TEXT'
    node.nodeName = node.localName = 'text'
    
    var textNode = {
      nodeId: layer.layerID + ps.TEXT_NODE_ID,
      nodeType: Node.TEXT_NODE,
      nodeName:"", localName:"",
      nodeValue: layer.textKey.textKey.replace(/\r/g,'\n'),
    }
    node.children = [textNode]
    node.childNodeCount = node.children.length
  }
  
  if (layer.hasFilterMask) attrObj.hasFilterMask = true
  if (layer.hasVectorMask) attrObj.hasVectorMask = true
  if (layer.hasUserMask) attrObj.hasUserMask = true
  if (layer.visible === false) attrObj.hidden = true
  if (layer.layerFXVisible && typeof layer.layerEffects == 'object') {
    Object.keys(layer.layerEffects).forEach(function(effectName){
      var effect = layer.layerEffects[effectName]
      if (effect.enabled === false) return;
      // attrObj['fx-' + effectName] = JSON.stringify(effect)
      attrObj['fx-' + effectName] = CSS._stringify(layer.layerEffects[effectName])
    })
  }
  
  delete layer.bounds.right
  delete layer.bounds.bottom
  attrObj.bounds = CSS._stringify(layer.bounds)
  
  
  attrObj.style = CSS._stringify(styleObj)
  if (attrObj.style === '') delete attrObj.style
  node.attributes = Object_toKeyValueArray(attrObj)
  
  return node
}

////////////////////////////////////////////////////////////////////////////////

Object_toKeyValueArray = function(object){
  var keyValueArray = []
  for (var key in object) {
    keyValueArray.push(key)
    keyValueArray.push(typeof object[key] == 'string' ? object[key] : JSON.stringify(object[key]))
  }
  return keyValueArray
}

////////////////////////////////////////////////////////////////////////////////

exports.DOM = DOMServer

function DOMServer(context){
  this._context = context
  this._cache = {}
}

DOMServer.prototype = { constructor: DOMServer }

DOMServer.prototype.NodeId = NodeId
function NodeId(){
  if (!NodeId.uid) NodeId.uid = 0
  return NodeId.uid ++
}

DOMServer.prototype.Node = Node
function Node(node){
  if (!(this instanceof Node)) return Node.cast(node)
}
Node.cast = function(node){
  node.__proto__ = Node
  return node
}

Node.ELEMENT_NODE = 1
Node.ATTRIBUTE_NODE = 2
Node.TEXT_NODE = 3
Node.CDATA_SECTION_NODE = 4
Node.ENTITY_REFERENCE_NODE = 5
Node.ENTITY_NODE = 6
Node.PROCESSING_INSTRUCTION_NODE = 7
Node.COMMENT_NODE = 8
Node.DOCUMENT_NODE = 9
Node.DOCUMENT_TYPE_NODE = 10
Node.DOCUMENT_FRAGMENT_NODE = 11
Node.NOTATION_NODE = 12

Node.prototype = {
  // "nodeId": "NodeId", // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
  // "nodeType": "integer", // `Node`'s nodeType
  // "nodeName": "string", // `Node`'s nodeName
  // "localName": "string", // `Node`'s localName
  // "nodeValue": "string", // `Node`'s nodeValue
  // "childNodeCount": "integer", "optional": true, // Child count for `Container` nodes
  // "children": "array", "optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
  // "attributes": "array", "optional": true, "items": { "type": "string" }, // Attributes of the `Element` node in the form of flat array `[name1, value1, name2, value2]`
  // "documentURL": "string", "optional": true, // Document URL that `Document` or `FrameOwner` node points to
  // "baseURL": "string", "optional": true, // Base URL that `Document` or `FrameOwner` node uses for URL completion
  // "publicId": "string", "optional": true, // `DocumentType`'s publicId
  // "systemId": "string", "optional": true, // `DocumentType`'s systemId
  // "helperSubset": "string", "optional": true, // `DocumentType`'s helperSubset
  // "xmlVersion": "string", "optional": true, // `Document`'s XML version in case of XML documents
  // "name": "string", "optional": true, // `Attr`'s name
  // "value": "string", "optional": true, // `Attr`'s value
  // "frameId": "Network.FrameId", "optional": true, // Frame ID for frame owner elements
  // "contentDocument": "Node", "optional": true, // Content document for frame owner elements
  // "shadowRoots": "array", "optional": true, "items": { "$ref": "Node" }, // Shadow root list for given element host
  // "templateContent": "Node", "optional": true, // Content document fragment for template elements"
}

DOMServer.prototype._addNodeToCache = function(node){
  if (node.nodeId in this._cache) {
    console.warn('duplicate node for nodeId. old:%s, new:%s', node, this._cache[node.nodeId])
    throw Error('duplicate node for nodeId')
  }
  this._cache[node.nodeId] = node
  if (node.children) node.children.forEach(function(child){
    if ('_parentId' in child && child._parentId != node.nodeId) throw Error('child._parentId != node.nodeId')
    child._parentId = node.nodeId
    this._addNodeToCache(child)
  }, this)
}

DOMServer.prototype._getNodeFromCache = function(nodeId){
  var node = this._cache[nodeId]
  if (node == null) throw Error('_getNodeFromCache: missing node ' + nodeId)
  return node
}

DOMServer.prototype._clearCache = function(){
  for (var key in this._cache) {
    delete this._cache[key]
  }
}

DOMServer.prototype.getDocument = function(params, callback, fire){
  this._clearCache()
  photoshop.invoke('PSFakeDOM.getDocumentNode', function(error, document){
    if (error) return callback(error)
    var node = ps.documentToNode(document)
    this._addNodeToCache(node)
    callback(null, {root:node})
  }.bind(this))
}

DOMServer.prototype.requestChildNodes = function requestChildNodes(params, callback, fire){
  var depth = params.depth || 1
  // Clients often call requestChildNodes with the same nodeId multiple times in a row.
  // If the server (that's us) responds to all of them with the same data, the client gets confused and adds the same nodes to the view multiple times.
  // If you immediately return (with success or an error) then the UI may not show the nodes at all.
  // So, we keep track of all the success callbacks and then call them all when we know that the expected events have fired ONCE.
  
  var parentNode = this._getNodeFromCache(params.nodeId)
  if (!Array.isArray(parentNode.requestChildNodes_callbacks)) parentNode.requestChildNodes_callbacks = []
  parentNode.requestChildNodes_callbacks.push(callback)
  
  // console.log('requestChildNodes', parentNode)
  
  function done(nodes){
    parentNode.children = nodes
    fire({method:"DOM.setChildNodes", params:{parentId:parentNode.nodeId, nodes:parentNode.children}})
    parentNode.requestChildNodes_callbacks.forEach(function(callback){ callback(null) })
    delete parentNode.requestChildNodes_callbacks
  }
  
  if (parentNode.children) return done(parentNode.children)
  
  if (parentNode.requestChildNodes_callbacks.length == 1) {
    photoshop.invoke('PSFakeDOM.requestChildNodes', [parentNode.nodeId, depth], function(error, children){
      if (error) return parentNode.requestChildNodes_callbacks.forEach(function(callback){ callback(error) });
      
      var nodes = children.map(ps.layerToNode).reverse()
      nodes.forEach(this._addNodeToCache, this)
      done(nodes)
    }.bind(this))
  }
}

// DOMServer.prototype.highlightNode = function(params, callback, fire){ callback() }
// DOMServer.prototype.hideHighlight = function(params, callback, fire){ callback() }

// TODO: DOMServer.prototype.performSearch = function(params, callback, fire){ callback() }

////////////////////////////////////////////////////////////////////////////////

Node.assert = function(node){
  console.assert(typeof node.nodeId == 'number')
  console.assert(typeof node.nodeType == 'number')
  console.assert(typeof node.nodeName == 'string')
  console.assert(typeof node.localName == 'string')
  if ('attributes' in node) console.assert(Array.isArray(node.attributes))
  if (node.children) node.children.forEach(Node.assert)
}
if (!module.parent){
  var dom = new DOMServer
  
  dom.getDocument(undefined, function(error, result){
    console.assert(!error)
    console.assert('root' in result)
    console.log(JSON.stringify(result.root, null, 2))
    Node.assert(result.root)
  })
  
  // {"method":"DOMServer.prototype.requestChildNodes","params":,"id":37}
  dom.requestChildNodes({"nodeId":1446},
    function callback(error, response){
      if (error) console.error('error', error);
      console.log('response', response)
    },
    function fire(event){
      console.log('fire', event)
      console.assert(event.params.parentId === 1446)
      event.params.nodes.forEach(Node.assert)
    }
  )
}

////////////////////////////////////////////////////////////////////////////////

exports.Console = ConsoleServer
function ConsoleServer(context){
  this._context = context
}

ConsoleServer.prototype = {
  constructor:ConsoleServer
}

ConsoleServer.prototype.addInspectedNode = function(params, callback, fire){
  var node = this._context.DOM._getNodeFromCache(params.nodeId)
  photoshop.invoke(
    function selectLayer(layerID){
      PSFakeDOM.debug = true;
      return PSFakeDOM.selectLayerByRef(PSFakeDOM.getLayerRefById(layerID))
    },
    node.nodeId,
    function(error, result){
      if (error) throw Error(error);
      callback(null)
    }
  )
}



////////////////////////////////////////////////////////////////////////////////

exports.Runtime = RuntimeServer
function RuntimeServer(context){
  this._context = context
  this._mirrorCache = new MirrorCache
}

RuntimeServer.prototype._eraseCachedObjectEverywhere = function(objectId){
  this._mirrorCache.forEach(function(_mirrorCache){
    _mirrorCache.erase(objectId)
  })
}

RuntimeServer.prototype._getCacheGroup = function(objectGroup){
  var _mirrorCache = this._mirrorCache.get(objectGroup)
  if (_mirrorCache == null)
    this._mirrorCache.set(objectGroup, _mirrorCache = new MirrorCache)
  return _mirrorCache
}

function MirrorCache(){
  this._cache = Object.create(null)
}
MirrorCache.prototype.set = function(id, value){
  if (id == null) return false
  if (id in this._cache) {
    console.warn('Cache clobber; Value with id already exists')
    console.trace()
  }
  this._cache[id] = value
}
MirrorCache.prototype.get = function(id){
  return this._cache[id]
}
MirrorCache.prototype.erase = function(id){
  return delete this._cache[id]
}
MirrorCache.prototype.eraseAll = function(){
  for (var id in this._cache)
    delete this._cache[id]
}
MirrorCache.prototype.forEach = function(callback, thisObj){
  Object.keys(this._cache).forEach(function(id, index, ids){
    callback.call(thisObj, this._mirrorCache[id], id, this)
  }, this)
}


function RemoteObjectId(object){
  
}
function RemoteObject(params, result){
  var responseRemoteObject = {
    type: "string",
    // subtype: undefined,
    // className: undefined,
    value: JSON.stringify(result),
    // description: undefined,
    // objectId: undefined,
    // preview: undefined,
  }
  
/*
  responseRemoteObject.type = typeof result
  
  if (responseRemoteObject.type == 'object'){
    if (result == null) responseRemoteObject.subtype = 'null'
    
    responseRemoteObject.objectId = params.expression
    if (Array.isArray(result)) responseRemoteObject.subtype = 'array'
    // else if (layerID in result) responseRemoteObject.subtype = 'node'
    responseRemoteObject.description = JSON.stringify(result)
    
    if (params.returnByValue)
      responseRemoteObject.value = result
    responseRemoteObject.returnByValue = params.returnByValue
  }
*/
  // else // DEBUG
  if (params.returnByValue) {
    responseRemoteObject.type = typeof result
    if (result === null) responseRemoteObject.subtype = 'null'
    else if (Array.isArray(result)) responseRemoteObject.subtype = 'array'
    responseRemoteObject.value = result
  }
  
  return responseRemoteObject
}


/*
{
    "id": "RemoteObject",
    "type": "object",
    "description": "Mirror object referencing original JavaScript object.",
    "properties": [
        { "name": "type", "type": "string", "enum": ["object", "function", "undefined", "string", "number", "boolean"], "description": "Object type." },
        { "name": "subtype", "type": "string", "optional": true, "enum": ["array", "null", "node", "regexp", "date"], "description": "Object subtype hint. Specified for <code>object</code> type values only." },
        { "name": "className", "type": "string", "optional": true, "description": "Object class (constructor) name. Specified for <code>object</code> type values only." },
        { "name": "value", "type": "any", "optional": true, "description": "Remote object value (in case of primitive values or JSON values if it was requested)." },
        { "name": "description", "type": "string", "optional": true, "description": "String representation of the object." },
        { "name": "objectId", "$ref": "RemoteObjectId", "optional": true, "description": "Unique object identifier (for non-primitive values)." },
        { "name": "preview", "$ref": "ObjectPreview", "optional": true, "description": "Preview containsing abbreviated property values.", "hidden": true }
    ]
}
*/
RuntimeServer.prototype.evaluate = function(params, callback, fire){
/*
  [
    { "name": "expression", "type": "string", "description": "Expression to evaluate." },
    { "name": "objectGroup", "type": "string", "optional": true, "description": "Symbolic group name that can be used to release multiple objects." },
    { "name": "includeCommandLineAPI", "type": "boolean", "optional": true, "description": "Determines whether Command Line API should be available during the evaluation.", "hidden": true },
    { "name": "doNotPauseOnExceptionsAndMuteConsole", "type": "boolean", "optional": true, "description": "Specifies whether evaluation should stop on exceptions and mute console. Overrides setPauseOnException state.", "hidden": true },
    { "name": "contextId", "$ref": "Runtime.ExecutionContextId", "optional": true, "description": "Specifies in which isolated context to perform evaluation. Each content script lives in an isolated context and this parameter may be used to specify one of those contexts. If the parameter is omitted or 0 the evaluation will be performed in the context of the inspected page.", "hidden": true },
    { "name": "returnByValue", "type": "boolean", "optional": true, "description": "Whether the result is expected to be a JSON object that should be sent by value." },
    { "name": "generatePreview", "type": "boolean", "optional": true, "hidden": true, "description": "Whether preview should be generated for the result." }
  ]
*/
  if (!params.objectGroup) params.objectGroup = 'default'
  
  var runtime = this
  var _mirrorCache = this._getCacheGroup(params.objectGroup)
  
  if (params.doNotPauseOnExceptionsAndMuteConsole && params.expression) {
    if (params.objectGroup == "completion"){
      callback(null, {result:{type:'object', objectId:params.expression}, wasThrown:false})
      return;
    }
    callback(null, null)
    return;
  }
  function handleResult(error, result){
    if (error) return callback(error, result);
    
    if (result && result.name && result.name.indexOf && result.name.indexOf('Error') > -1) {
      error = true
    }
    
    if (runtime._context.config.debug) runtime._context.config.debug(result)
    
    var responseRemoteObject = RemoteObject(params, result)
    _mirrorCache.set(responseRemoteObject.objectId, responseRemoteObject)
    callback(null, {result:responseRemoteObject, wasThrown:!!error})
  }
  
  if (params.functionDeclaration){
    photoshop.include(this.ps_CommandLineAPI_imports).invoke('function(thisObj) { thisObj = function(){return eval(thisObj)}.call(null);\nreturn (' + params.functionDeclaration + ').call(thisObj, typeof thisObj)}', params.objectId, handleResult)
  }
  else {
    photoshop.include(this.ps_CommandLineAPI_imports).invoke('eval', params.expression, handleResult)
  }
}

// Internal method; Not part of the API spec
RuntimeServer.prototype.addCommandLineAPI = function(params, callback, fire){
  if (!this.ps_CommandLineAPI_imports) this.ps_CommandLineAPI_imports = []
  var ps_CommandLineAPI_imports = this.ps_CommandLineAPI_imports
  require('fs').exists(params.path, function(exists){
    if (!exists) return callback(Error('does not exist'))
    ps_CommandLineAPI_imports.push(params.path)
    callback(null, params)
  })
}

RuntimeServer.prototype.callFunctionOn = RuntimeServer.prototype.evaluate

RuntimeServer.prototype.releaseObject = function(params, callback, fire){
  this._eraseCachedObjectEverywhere(params.objectId)
  callback(null)
}

RuntimeServer.prototype.releaseObjectGroup = function(params, callback, fire){
  this._getCacheGroup(params.objectGroup || 'default').eraseAll()
  callback(null)
}



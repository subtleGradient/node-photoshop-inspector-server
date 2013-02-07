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
      return
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
    
    "documentURL": "file://" + document.path.split('/').map(encodeURIComponent).join('/').replace('~', process.env.HOME), //"optional": true, // Document URL that `Document` or `FrameOwner` node points to
  }
  
  // "childNodeCount": document.children && document.children.length || 0, //, "optional": true, // Child count for `Container` nodes
  // "children": document.children.filter(Boolean).map(ps.layerToNode, document), //"optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
  
  node.children = document.children.map(ps.layerToNode).reverse()
  // node.children = ps.layerTreeFromLayerList(document.children.filter(Boolean).reverse()).map(ps.layerToNode, document)
  node.childNodeCount = node.children && node.children.length || 0
  
  node.baseURL = node.documentURL
  return node
}

ps.TEXT_NODE_ID = 0xF00D

ps.layerToNode = function(layer){
  if (!layer) return
  
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
  if (layer.visible == false) attrObj.hidden = true
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
  if (attrObj.style == '') delete attrObj.style
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

function DOMServer(){
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

DOMServer.prototype.highlightNode = function(params, callback, fire){ callback() }
DOMServer.prototype.hideHighlight = function(params, callback, fire){ callback() }

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

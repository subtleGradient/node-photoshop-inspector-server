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
    "nodeType": DOM.NodeType.DOCUMENT_NODE, // `Node`'s nodeType
    "nodeName": "#document", // `Node`'s nodeName
    "localName": "", // `Node`'s localName
    // "nodeValue": null, // `Node`'s nodeValue
    
    "documentURL": "file://" + document.path.split('/').map(encodeURIComponent).join('/').replace('~', process.env.HOME), //"optional": true, // Document URL that `Document` or `FrameOwner` node points to
  }
  
  // "childNodeCount": document.children && document.children.length || 0, //, "optional": true, // Child count for `Container` nodes
  // "children": document.children.filter(Boolean).map(ps.layerToNode, document), //"optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
  
  node.children = document.children.map(ps.layerToNode)
  // node.children = ps.layerTreeFromLayerList(document.children.filter(Boolean).reverse()).map(ps.layerToNode, document)
  node.childNodeCount = node.children && node.children.length || 0
  
  node.baseURL = node.documentURL
  return node
}

ps.layerToNode = function(layer){
  if (!layer) return
  
  var node = {
    "nodeId": layer.layerID, // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
    "nodeType": DOM.NodeType.ELEMENT_NODE, // `Node`'s nodeType
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
  
  'hasFilterMask hasVectorMask hasUserMask'.split(' ').forEach(function(key){
    if (layer[key]) attrObj[key] = true
  })
  
  if (layer.visible == false) attrObj.hidden = true
  
  delete layer.bounds.right
  delete layer.bounds.bottom
  attrObj.bounds = CSS._stringify(layer.bounds)
  
  attrObj.style = CSS._stringify(styleObj)
  if (attrObj.style == '') delete attrObj.style
  node.attributes = Object_toKeyValueArray(attrObj)
  
  delete node.children // FIXME: DEBUG
  
  
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

var DOM = exports

DOM.NodeId = function NodeId(){
  if (!NodeId.uid) NodeId.uid = 0
  return NodeId.uid ++
}

DOM.Node = function Node(){}

DOM.NodeType = {
  ELEMENT_NODE:1,
  ATTRIBUTE_NODE:2,
  TEXT_NODE:3,
  CDATA_SECTION_NODE:4,
  ENTITY_REFERENCE_NODE:5,
  ENTITY_NODE:6,
  PROCESSING_INSTRUCTION_NODE:7,
  COMMENT_NODE:8,
  DOCUMENT_NODE:9,
  DOCUMENT_TYPE_NODE:10,
  DOCUMENT_FRAGMENT_NODE:11,
  NOTATION_NODE:12,
}

DOM.Node.prototype = {
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

DOM.getDocument = function(params, callback, fire){
  photoshop.invoke('PSFakeDOM.getDocumentNode', function(error, document){
    if (error) return callback(error)
    var node = ps.documentToNode(document)
    callback(null, {root:node})
  })
}

DOM.requestChildNodes = function(params, callback, fire){
  photoshop.invoke('PSFakeDOM.requestChildNodes', [params.nodeId, params.depth || 1], function(error, children){
    if (error) return callback(error)
    var nodes = children.map(ps.layerToNode)
    fire({method:"DOM.setChildNodes", params:{parentId:params.nodeId, nodes:nodes}})
    callback(null)
  })
}

DOM.highlightNode = function(params, callback, fire){ callback() }
DOM.hideHighlight = function(params, callback, fire){ callback() }

// TODO: DOM.performSearch = function(params, callback, fire){ callback() }

////////////////////////////////////////////////////////////////////////////////

DOM.Node.assert = function(node){
  console.assert(typeof node.nodeId == 'number')
  console.assert(typeof node.nodeType == 'number')
  console.assert(typeof node.nodeName == 'string')
  console.assert(typeof node.localName == 'string')
  if ('attributes' in node) console.assert(Array.isArray(node.attributes))
  if (node.children) node.children.forEach(DOM.Node.assert)
}
if (!module.parent){
/*
  DOM.getDocument(undefined, function(error, result){
    console.assert(!error)
    console.assert('root' in result)
    console.log(JSON.stringify(result.root, null, 2))
    DOM.Node.assert(result.root)
  })
*/
  
  // {"method":"DOM.requestChildNodes","params":,"id":37}
  DOM.requestChildNodes({"nodeId":1446},
    function callback(error, response){
      if (error) console.error('error', error);
      console.log('response', response)
    },
    function fire(event){
      console.log('fire', event)
      console.assert(event.params.parentId === 1446)
      event.params.nodes.forEach(DOM.Node.assert)
    }
  )
}

if (false){
;
({
  "method": "DOM.requestChildNodes",
  "params": {
    "nodeId": 43
  },
  "id": 431
});
({
  "method": "DOM.setChildNodes",
  "params": {
    "parentId": 43,
    "nodes": [{ "nodeId": 52, "nodeType": 1, "nodeName": "SPAN", "localName": "span", "nodeValue": "", "childNodeCount": 2, "attributes": [] },
    { "nodeId": 53, "nodeType": 1, "nodeName": "FORM", "localName": "form", "nodeValue": "", "childNodeCount": 2, "attributes": ["target", "", "method", "GET"] }]
  }
})
}


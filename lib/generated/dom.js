var photoshop = require('../ps-lib/photoshop.node.js')
if (!module.parent) {
  photoshop.run(function(){
    return app.activeDocument
  }, function(error, result){
    console.log(error, result)
  })
}

exports.NodeId = function NodeId(){
  if (!NodeId.uid) NodeId.uid = 0
  return NodeId.uid ++
}

exports.Node = function Node(){}

exports.NodeType = {
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

exports.Node.prototype = {
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
  // "internalSubset": "string", "optional": true, // `DocumentType`'s internalSubset
  // "xmlVersion": "string", "optional": true, // `Document`'s XML version in case of XML documents
  // "name": "string", "optional": true, // `Attr`'s name
  // "value": "string", "optional": true, // `Attr`'s value
  // "frameId": "Network.FrameId", "optional": true, // Frame ID for frame owner elements
  // "contentDocument": "Node", "optional": true, // Content document for frame owner elements
  // "shadowRoots": "array", "optional": true, "items": { "$ref": "Node" }, // Shadow root list for given element host
  // "templateContent": "Node", "optional": true, // Content document fragment for template elements"
}

exports.psDocumentToNode = function(document){
  var node = {
    "nodeId": document.layerID || document.id || -1, // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
    "nodeType": exports.NodeType.DOCUMENT_NODE, // `Node`'s nodeType
    "nodeName": "#document", // `Node`'s nodeName
    "localName": "", // `Node`'s localName
    // "nodeValue": null, // `Node`'s nodeValue
    
    "childNodeCount": document.children && document.children.length || 0, //, "optional": true, // Child count for `Container` nodes
    "children": document.children.filter(Boolean).map(exports.psLayerToNode, document), //"optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
    "documentURL": "file://" + document.path.split('/').map(encodeURIComponent).join('/').replace('~', process.env.HOME), //"optional": true, // Document URL that `Document` or `FrameOwner` node points to
    // "baseURL": "string", "optional": true, // Base URL that `Document` or `FrameOwner` node uses for URL completion
    // "attributes": "array", "optional": true, "items": { "type": "string" }, // Attributes of the `Element` node in the form of flat array `[name1, value1, name2, value2]`
    
    // "publicId": "string", "optional": true, // `DocumentType`'s publicId
    // "systemId": "string", "optional": true, // `DocumentType`'s systemId
    // "internalSubset": "string", "optional": true, // `DocumentType`'s internalSubset
    // "xmlVersion": "string", "optional": true, // `Document`'s XML version in case of XML documents
    // "name": "string", "optional": true, // `Attr`'s name
    // "value": "string", "optional": true, // `Attr`'s value
    // "frameId": "Network.FrameId", "optional": true, // Frame ID for frame owner elements
    // "contentDocument": "Node", "optional": true, // Content document for frame owner elements
    // "shadowRoots": "array", "optional": true, "items": { "$ref": "Node" }, // Shadow root list for given element host
    // "templateContent": "Node", "optional": true, // Content document fragment for template elements"
  }
  node.baseURL = node.documentURL
  return node
}

Object_toKeyValueArray = function(object){
  var keyValueArray = []
  for (var key in object) {
    keyValueArray.push(key)
    keyValueArray.push(typeof object[key] == 'string' ? object[key] : JSON.stringify(object[key]))
  }
  return keyValueArray
}

exports.psLayerToNode = function(layer){
  if (!layer) return
  // console.log('psLayerToNode', layer)
  var node = {
    "nodeId": layer.layerID, // Node identifier that is passed into the rest of the DOM messages as the `nodeId`. Backend will only push node with given `id` once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client
    "nodeType": exports.NodeType.ELEMENT_NODE, // `Node`'s nodeType
    "nodeName": "LAYER", // `Node`'s nodeName
    "localName": "layer", // `Node`'s localName
    // "nodeValue": null, // `Node`'s nodeValue
    
    "attributes": Object_toKeyValueArray(layer), //"array", "optional": true, "items": { "type": "string" }, // Attributes of the `Element` node in the form of flat array `[name1, value1, name2, value2]`
    
    // "childNodeCount": "integer", "optional": true, // Child count for `Container` nodes
    // "children": "array", "optional": true, "items": { "$ref": "Node" }, // Child nodes of this node when requested with children
    // "documentURL": "string", "optional": true, // Document URL that `Document` or `FrameOwner` node points to
    // "baseURL": "string", "optional": true, // Base URL that `Document` or `FrameOwner` node uses for URL completion
    // "publicId": "string", "optional": true, // `DocumentType`'s publicId
    // "systemId": "string", "optional": true, // `DocumentType`'s systemId
    // "internalSubset": "string", "optional": true, // `DocumentType`'s internalSubset
    // "xmlVersion": "string", "optional": true, // `Document`'s XML version in case of XML documents
    // "name": "string", "optional": true, // `Attr`'s name
    // "value": "string", "optional": true, // `Attr`'s value
    // "frameId": "Network.FrameId", "optional": true, // Frame ID for frame owner elements
    // "contentDocument": "Node", "optional": true, // Content document for frame owner elements
    // "shadowRoots": "array", "optional": true, "items": { "$ref": "Node" }, // Shadow root list for given element host
    // "templateContent": "Node", "optional": true, // Content document fragment for template elements"
  }
  return node
}

exports.getDocument = function(params, callback, fire){
  
  photoshop.getDocument(function(error, document){
    if (error) return callback(error)
    try {
      var node = exports.psDocumentToNode(document)
      callback(null, {root:node})
    }
    catch(e){callback(e.toString(), e)}
  })
  
  // callback(null, {
  //   "root": {
  //     "nodeId": -1,
  //     "nodeType": 9,
  //     "nodeName": "#document",
  //     "localName": "",
  //     "children": [{
  //       "nodeId": 22,
  //       "nodeType": 1,
  //       "nodeName": "HTML",
  //       "localName": "html",
  //       "children": [
  //         { "nodeId": 23, "nodeType": 1, "nodeName": "HEAD", "localName": "head", "nodeValue": "", "childNodeCount": 0, "attributes": [] },
  //         { "nodeId": 24, "nodeType": 1, "nodeName": "BODY", "localName": "body", "nodeValue": "", "childNodeCount": 0, "attributes": [] }
  //       ],
  //     }],
  //   }
  // })
}

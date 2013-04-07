var photoshop = require('photoshop')

if (!module.parent) {
  photoshop.run(function(){
    return app.activeDocument
  }, function(error, result){
    console.log(error, result)
  })
}

////////////////////////////////////////////////////////////////////////////////

exports.DOMServer = DOMServer

var MirrorCache = require('./MirrorCache').MirrorCache

function DOMServer(context){
  this._context = context
  this._mirrorCache = new MirrorCache()
}

var DOM = DOMServer.prototype = { constructor: DOMServer }

DOM.NodeId = NodeId

NodeId.uid = 0
function NodeId(){ return NodeId.uid++ }

DOM.Node = Node

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

DOM._addNodeToCache = function(node){
  var old = this._mirrorCache.get(node.nodeId)
  if (old != null) {
    console.warn('duplicate node for nodeId', node, old)
    throw Error('duplicate node for nodeId')
  }
  this._mirrorCache.set(node.nodeId, node)
  if (node.children) node.children.forEach(function(child){
    if ('_parentId' in child && child._parentId != node.nodeId) throw Error('child._parentId != node.nodeId')
    child._parentId = node.nodeId
    this._addNodeToCache(child)
  }, this)
}

DOM._getNodeFromCache = function(nodeId){
  var node = this._mirrorCache.get(nodeId)
  if (node == null) throw Error('_getNodeFromCache: missing node ' + nodeId)
  return node
}

DOM.getDocument = function(params, callback, fire){
  this._mirrorCache.eraseAll()
  photoshop.invoke('PSFakeDOM.getDocumentNode', function(error, document){
    if (error) return callback(error)
    var node = ps.documentToNode(document)
    this._addNodeToCache(node)
    callback(null, {root:node})
  }.bind(this))
}

DOM.requestChildNodes = function requestChildNodes(params, callback, fire){
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

DOM.highlightNode = function(params, callback, fire){ callback() }
DOM.hideHighlight = function(params, callback, fire){ callback() }

// TODO: DOM.performSearch = function(params, callback, fire){ callback() }

DOM.setAttributeValue = function setAttributeValue(params, callback, fire){
  var methodName = 'ao_set:' + params.name
  if (!(methodName in this)) return callback(Error('not implemented'));
  this[methodName](params, callback, fire)
}

var path = require('path')
var url = require('url')
var fs = require('fs')

var fs = require('fs')
var url = require('url')
var request = require('request')

function downloadImage(_url, callback){
  request.head(_url, function(error, response, body){
    if (error) return callback(error)
    var ext = response.headers['content-type'] && response.headers['content-type'].split('/')[1]
    if (!ext) ext = path.extname(response.req.path).replace('.','')
    var _path = process.env.TMPDIR + '/TemporaryItems/' + encodeURIComponent(_url) + '.' + ext
    var stream = request(_url)
    stream.pipe(fs.createWriteStream(_path))
    stream.on('end', function(){ callback(null, _path) })
    stream.on('error', callback)
  })
  return
}

DOM['ao_set:data'] = function(params, callback, fire){
  var requestedPath = url.parse(params.value, true)
  
  if (requestedPath.protocol == null || requestedPath.protocol == 'file:'){
    fs.exists(requestedPath.path, function(exists){
      if (exists) return setPath(requestedPath.path, requestedPath.path, callback);
      console.warn("Path '%s' doesn't exist", requestedPath.path)
      
      photoshop.invoke('app.activeDocument.fullName.fsName.toString', function(error, activeDocument_path){
        if (error) return callback(error);
        
        var relativePath = path.dirname(activeDocument_path) +'/'+ requestedPath.path
        fs.exists(relativePath, function(exists){
          if (exists) return setPath(relativePath, requestedPath.path, callback);
          var error = Error('path "' + relativePath + '" does not exist')
          console.error(error+'')
          callback(error)
        })
      })
    })
    return
  }
  
  else if (requestedPath.protocol == 'http:' || requestedPath.protocol == 'https:'){
    downloadImage(requestedPath.href, function(error, path){
      if (error) return callback(error)
      setPath(path, requestedPath.href, callback)
    })
    return
  }
  
  throw Error('Protocol not yet supported')
  
  function setPath(path, originalPath, callback){
    photoshop.invoke(
      function setData(layerID, path, url){
        var layerRef = PSFakeDOM.getLayerRefById(layerID)
        PSFakeDOM.setLayer_source(layerRef, path)
        PSFakeDOM.setLayer_sourceMeta(layerRef, url)
        return path
      },
      [params.nodeId, path, originalPath],
      function(error, path){
        if (error) return callback(error);
        fire({method:"DOM.attributeModified", params:{nodeId:params.nodeId, name:'data', value:originalPath}})
        callback(null)
      }
    )
  }
}

var htmlparser = require("htmlparser");

DOM.setAttributesAsText = function setAttributesAsText(params, callback, fire){
  var DOM = this
  var handler = new htmlparser.DefaultHandler(function(error, dom){
    if (error) return callback(error);
    try {
      var attribs = dom[0].attribs
      Object.keys(attribs).forEach(function(key){
        DOM.setAttributeValue({nodeId:params.nodeId, name:key, value:attribs[key]}, callback, fire)
      })
    }
    catch(e){return callback(e)}
  });
  var parser = new htmlparser.Parser(handler);
  parser.parseComplete('<setAttributesAsText ' + params.text);
}

DOM.setNodeValue = function(params, callback, fire){
  var nodeId = params.nodeId - ps.TEXT_NODE_ID
  throw Error('Not Implemented')
}

DOM.resolveNode = function(params, callback, fire){
  // params.nodeId
  // params.objectGroup
  
  // callback(null, {object:this._context.Runtime.RemoteObject()})
  
  throw Error('Not Implemented')
}

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
  
  // {"method":"DOM.requestChildNodes","params":,"id":37}
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


var CSS = require('./css')

var ps = {}

ps.int8ToFloat = function(int8){
  return Math.round(int8 / 0xFF * 100) / 100
}

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
    
  var styleObj = {
    opacity: ps.int8ToFloat(layer.opacity),
  }
  if (styleObj.opacity == 1) delete styleObj.opacity
  
  // styleObj.fill = ps.int8ToFloat(layer.adjustment[0].color)
  
  var attrObj = {
    // id: layer.layerID,
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
  
  // if (layer.metadata && layer.metadata.layerXMP) {
  //   // attrObj.xmp = layer.metadata.layerXMP
  //   attrObj.hasXMP = true
  // }
  
  if (layer.smartObject) {
    node.nodeName = 'OBJECT'
    node.nodeName = node.localName = 'object'
    attrObj.data = layer.parsedMetadata && layer.parsedMetadata.source || layer.smartObject.fileReference
  }
  
  if (layer.textKey) {
    // console.log(layer)
    node.nodeName = 'TEXT'
    node.nodeName = node.localName = 'text'
    
    // var textNode = {
    //   nodeId: layer.layerID + ps.TEXT_NODE_ID,
    //   nodeType: Node.TEXT_NODE,
    //   nodeName:"", localName:"",
    //   nodeValue: layer.textKey.textKey.replace(/\r/g,'\n'),
    // }
    // node.children = [textNode]
    node.children = layer.textKey.textStyleRange.map(function(textStyleRange, index){
      return {
        "_jsPath": 'textKey.textStyleRange[' + index + ']',
        nodeId: (layer.layerID << 16) + NodeId(),
        nodeType: Node.TEXT_NODE,
        nodeName:"", localName:"",
        nodeValue: layer.textKey.textKey.substring(textStyleRange.from, textStyleRange.to)
      }
    })
    node.childNodeCount = node.children.length
  }
  
  if (layer.hasFilterMask) attrObj.hasFilterMask = true
  if (layer.hasVectorMask) attrObj.hasVectorMask = true
  if (layer.hasUserMask) attrObj.hasUserMask = true
  if (layer.visible === false) attrObj.hidden = true
  // if (layer.layerFXVisible && typeof layer.layerEffects == 'object') {
  //   Object.keys(layer.layerEffects).forEach(function(effectName){
  //     var effect = layer.layerEffects[effectName]
  //     if (effect.enabled === false) return;
  //     // attrObj['fx-' + effectName] = JSON.stringify(effect)
  //     attrObj['fx-' + effectName] = CSS._stringify(layer.layerEffects[effectName])
  //   })
  // }
  
  // delete layer.bounds.right
  // delete layer.bounds.bottom
  // attrObj.bounds = CSS._stringify(layer.bounds)
  if (layer.adjustment){
    node.nodeName = node.tagName = 'adjustment'
    if (layer.hasVectorMask){
      node.nodeName = node.tagName = 'shape'
      delete attrObj.hasVectorMask
    }
    
    // if (layer.adjustment.length == 1 && layer.adjustment[0] && layer.adjustment[0].color){
    //   styleObj.fill = CSS._layerColorToCSSColor(layer.adjustment[0].color)
    // }
    // else if (layer.adjustment.length == 1 && layer.adjustment[0] && layer.adjustment[0].gradient){
    //   styleObj.gradient = layer.adjustment[0].gradient
    // }
    // else attrObj.adjustment = CSS._stringify(layer.adjustment)
  }
  
  attrObj.style = CSS._stringify(styleObj)
  if (attrObj.style === '') delete attrObj.style
  node.attributes = Object_toKeyValueArray(attrObj)
  
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

////////////////////////////////////////////////////////////////////////////////

var protocol = {
  "domain": "DOM",
  "description": "This domain exposes DOM read/write operations. Each DOM Node is represented with its mirror object that has an <code>id</code>. This <code>id</code> can be used to get additional information on the Node, resolve it into the JavaScript object wrapper, etc. It is important that client receives DOM events only for the nodes that are known to the client. Backend keeps track of the nodes that were sent to the client and never sends the same node twice. It is client's responsibility to collect information about the nodes that were sent to the client.<p>Note that <code>iframe</code> owner elements will return corresponding document elements as their child nodes.</p>",
  "types": [{
    "id": "NodeId",
    "type": "integer",
    "description": "Unique DOM node identifier."
  },
  {
    "id": "Node",
    "type": "object",
    "properties": [
      { "name": "nodeId", "$ref": "NodeId", "description": "Node identifier that is passed into the rest of the DOM messages as the <code>nodeId</code>. Backend will only push node with given <code>id</code> once. It is aware of all requested nodes and will only fire DOM events for nodes known to the client." },
      { "name": "nodeType", "type": "integer", "description": "<code>Node</code>'s nodeType." },
      { "name": "nodeName", "type": "string", "description": "<code>Node</code>'s nodeName." },
      { "name": "localName", "type": "string", "description": "<code>Node</code>'s localName." },
      { "name": "nodeValue", "type": "string", "description": "<code>Node</code>'s nodeValue." },
      { "name": "childNodeCount", "type": "integer", "optional": true, "description": "Child count for <code>Container</code> nodes." },
      { "name": "children", "type": "array", "optional": true, "items": { "$ref": "Node" }, "description": "Child nodes of this node when requested with children." },
      { "name": "attributes", "type": "array", "optional": true, "items": { "type": "string" }, "description": "Attributes of the <code>Element</code> node in the form of flat array <code>[name1, value1, name2, value2]</code>." },
      { "name": "documentURL", "type": "string", "optional": true, "description": "Document URL that <code>Document</code> or <code>FrameOwner</code> node points to." },
      { "name": "baseURL", "type": "string", "optional": true, "description": "Base URL that <code>Document</code> or <code>FrameOwner</code> node uses for URL completion." },
      { "name": "publicId", "type": "string", "optional": true, "description": "<code>DocumentType</code>'s publicId." },
      { "name": "systemId", "type": "string", "optional": true, "description": "<code>DocumentType</code>'s systemId." },
      { "name": "internalSubset", "type": "string", "optional": true, "description": "<code>DocumentType</code>'s internalSubset." },
      { "name": "xmlVersion", "type": "string", "optional": true, "description": "<code>Document</code>'s XML version in case of XML documents." },
      { "name": "name", "type": "string", "optional": true, "description": "<code>Attr</code>'s name." },
      { "name": "value", "type": "string", "optional": true, "description": "<code>Attr</code>'s value." },
      { "name": "frameId", "$ref": "Network.FrameId", "optional": true, "description": "Frame ID for frame owner elements." },
      { "name": "contentDocument", "$ref": "Node", "optional": true, "description": "Content document for frame owner elements." },
      { "name": "shadowRoots", "type": "array", "optional": true, "items": { "$ref": "Node" }, "description": "Shadow root list for given element host." },
      { "name": "templateContent", "$ref": "Node", "optional": true, "description": "Content document fragment for template elements" }
    ],
    "description": "DOM interaction is implemented in terms of mirror objects that represent the actual DOM nodes. DOMNode is a base node mirror type."
  },
  {
    "id": "EventListener",
    "type": "object",
    "hidden": true,
    "properties": [
      { "name": "type", "type": "string", "description": "<code>EventListener</code>'s type." },
      { "name": "useCapture", "type": "boolean", "description": "<code>EventListener</code>'s useCapture." },
      { "name": "isAttribute", "type": "boolean", "description": "<code>EventListener</code>'s isAttribute." },
      { "name": "nodeId", "$ref": "NodeId", "description": "Target <code>DOMNode</code> id." },
      { "name": "handlerBody", "type": "string", "description": "Event handler function body." },
      { "name": "location", "$ref": "Debugger.Location", "optional": true, "description": "Handler code location." },
      { "name": "sourceName", "type": "string", "optional": true, "description": "Source script URL." },
      { "name": "handler", "$ref": "Runtime.RemoteObject", "optional": true, "description": "Event handler function value." }
    ],
    "description": "DOM interaction is implemented in terms of mirror objects that represent the actual DOM nodes. DOMNode is a base node mirror type."
  },
  {
    "id": "RGBA",
    "type": "object",
    "properties": [
      { "name": "r", "type": "integer", "description": "The red component, in the [0-255] range." },
      { "name": "g", "type": "integer", "description": "The green component, in the [0-255] range." },
      { "name": "b", "type": "integer", "description": "The blue component, in the [0-255] range." },
      { "name": "a", "type": "number", "optional": true, "description": "The alpha component, in the [0-1] range (default: 1)." }
    ],
    "description": "A structure holding an RGBA color."
  },
  {
    "id": "HighlightConfig",
    "type": "object",
    "properties": [
      { "name": "showInfo", "type": "boolean", "optional": true, "description": "Whether the node info tooltip should be shown (default: false)." },
      { "name": "contentColor", "$ref": "RGBA", "optional": true, "description": "The content box highlight fill color (default: transparent)." },
      { "name": "paddingColor", "$ref": "RGBA", "optional": true, "description": "The padding highlight fill color (default: transparent)." },
      { "name": "borderColor", "$ref": "RGBA", "optional": true, "description": "The border highlight fill color (default: transparent)." },
      { "name": "marginColor", "$ref": "RGBA", "optional": true, "description": "The margin highlight fill color (default: transparent)." }
    ],
    "description": "Configuration data for the highlighting of page elements."
  }],
  "commands": [{
    "name": "getDocument",
    "returns": [
      { "name": "root", "$ref": "Node", "description": "Resulting node." }
    ],
    "description": "Returns the root DOM node to the caller."
  },
  {
    "name": "requestChildNodes",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to get children for."
    },
    {
      "name": "depth",
      "type": "integer",
      "optional": true,
      "description": "The maximum depth at which children should be retrieved, defaults to 1. Use -1 for the entire subtree or provide an integer larger than 0."
    }],
    "description": "Requests that children of the node with given id are returned to the caller in form of <code>setChildNodes</code> events where not only immediate children are retrieved, but all children down to the specified depth."
  },
  {
    "name": "querySelector",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to query upon."
    },
    {
      "name": "selector",
      "type": "string",
      "description": "Selector string."
    }],
    "returns": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Query selector result."
    }],
    "description": "Executes <code>querySelector</code> on a given node."
  },
  {
    "name": "querySelectorAll",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to query upon."
    },
    {
      "name": "selector",
      "type": "string",
      "description": "Selector string."
    }],
    "returns": [{
      "name": "nodeIds",
      "type": "array",
      "items": {
        "$ref": "NodeId"
      },
      "description": "Query selector result."
    }],
    "description": "Executes <code>querySelectorAll</code> on a given node."
  },
  {
    "name": "setNodeName",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to set name for."
    },
    {
      "name": "name",
      "type": "string",
      "description": "New node's name."
    }],
    "returns": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "New node's id."
    }],
    "description": "Sets node name for a node with given id."
  },
  {
    "name": "setNodeValue",
    "parameters": [
      { "name": "nodeId", "$ref": "NodeId", "description": "Id of the node to set value for." },
      { "name": "value", "type": "string", "description": "New node's value." }
    ],
    "description": "Sets node value for a node with given id."
  },
  {
    "name": "removeNode",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to remove."
    }],
    "description": "Removes node with given id."
  },
  {
    "name": "setAttributeValue",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the element to set attribute for."
    },
    {
      "name": "name",
      "type": "string",
      "description": "Attribute name."
    },
    {
      "name": "value",
      "type": "string",
      "description": "Attribute value."
    }],
    "description": "Sets attribute for an element with given id."
  },
  {
    "name": "setAttributesAsText",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the element to set attributes for."
    },
    {
      "name": "text",
      "type": "string",
      "description": "Text with a number of attributes. Will parse this text using HTML parser."
    },
    {
      "name": "name",
      "type": "string",
      "optional": true,
      "description": "Attribute name to replace with new attributes derived from text in case text parsed successfully."
    }],
    "description": "Sets attributes on element with given id. This method is useful when user edits some existing attribute value and types in several attribute name/value pairs."
  },
  {
    "name": "removeAttribute",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the element to remove attribute from."
    },
    {
      "name": "name",
      "type": "string",
      "description": "Name of the attribute to remove."
    }],
    "description": "Removes attribute with given name from an element with given id."
  },
  {
    "name": "getEventListenersForNode",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to get listeners for."
    },
    {
      "name": "objectGroup",
      "type": "string",
      "optional": true,
      "description": "Symbolic group name for handler value. Handler value is not returned without this parameter specified."
    }],
    "returns": [{
      "name": "listeners",
      "type": "array",
      "items": {
        "$ref": "EventListener"
      },
      "description": "Array of relevant listeners."
    }],
    "description": "Returns event listeners relevant to the node.",
    "hidden": true
  },
  {
    "name": "getOuterHTML",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to get markup for."
    }],
    "returns": [{
      "name": "outerHTML",
      "type": "string",
      "description": "Outer HTML markup."
    }],
    "description": "Returns node's HTML markup."
  },
  {
    "name": "setOuterHTML",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to set markup for."
    },
    {
      "name": "outerHTML",
      "type": "string",
      "description": "Outer HTML markup to set."
    }],
    "description": "Sets node HTML markup, returns new node id."
  },
  {
    "name": "performSearch",
    "parameters": [{
      "name": "query",
      "type": "string",
      "description": "Plain text or query selector or XPath search query."
    }],
    "returns": [{
      "name": "searchId",
      "type": "string",
      "description": "Unique search session identifier."
    },
    {
      "name": "resultCount",
      "type": "integer",
      "description": "Number of search results."
    }],
    "description": "Searches for a given string in the DOM tree. Use <code>getSearchResults</code> to access search results or <code>cancelSearch</code> to end this search session.",
    "hidden": true
  },
  {
    "name": "getSearchResults",
    "parameters": [{
      "name": "searchId",
      "type": "string",
      "description": "Unique search session identifier."
    },
    {
      "name": "fromIndex",
      "type": "integer",
      "description": "Start index of the search result to be returned."
    },
    {
      "name": "toIndex",
      "type": "integer",
      "description": "End index of the search result to be returned."
    }],
    "returns": [{
      "name": "nodeIds",
      "type": "array",
      "items": {
        "$ref": "NodeId"
      },
      "description": "Ids of the search result nodes."
    }],
    "description": "Returns search results from given <code>fromIndex</code> to given <code>toIndex</code> from the sarch with the given identifier.",
    "hidden": true
  },
  {
    "name": "discardSearchResults",
    "parameters": [{
      "name": "searchId",
      "type": "string",
      "description": "Unique search session identifier."
    }],
    "description": "Discards search results from the session with the given id. <code>getSearchResults</code> should no longer be called for that search.",
    "hidden": true
  },
  {
    "name": "requestNode",
    "parameters": [{
      "name": "objectId",
      "$ref": "Runtime.RemoteObjectId",
      "description": "JavaScript object id to convert into node."
    }],
    "returns": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Node id for given object."
    }],
    "description": "Requests that the node is sent to the caller given the JavaScript node object reference. All nodes that form the path from the node to the root are also sent to the client as a series of <code>setChildNodes</code> notifications."
  },
  {
    "name": "setInspectModeEnabled",
    "hidden": true,
    "parameters": [{
      "name": "enabled",
      "type": "boolean",
      "description": "True to enable inspection mode, false to disable it."
    },
    {
      "name": "highlightConfig",
      "$ref": "HighlightConfig",
      "optional": true,
      "description": "A descriptor for the highlight appearance of hovered-over nodes. May be omitted if <code>enabled == false</code>."
    }],
    "description": "Enters the 'inspect' mode. In this mode, elements that user is hovering over are highlighted. Backend then generates 'inspect' command upon element selection."
  },
  {
    "name": "highlightRect",
    "parameters": [{
      "name": "x",
      "type": "integer",
      "description": "X coordinate"
    },
    {
      "name": "y",
      "type": "integer",
      "description": "Y coordinate"
    },
    {
      "name": "width",
      "type": "integer",
      "description": "Rectangle width"
    },
    {
      "name": "height",
      "type": "integer",
      "description": "Rectangle height"
    },
    {
      "name": "color",
      "$ref": "RGBA",
      "optional": true,
      "description": "The highlight fill color (default: transparent)."
    },
    {
      "name": "outlineColor",
      "$ref": "RGBA",
      "optional": true,
      "description": "The highlight outline color (default: transparent)."
    }],
    "description": "Highlights given rectangle. Coordinates are absolute with respect to the main frame viewport."
  },
  {
    "name": "highlightNode",
    "parameters": [{
      "name": "highlightConfig",
      "$ref": "HighlightConfig",
      "description": "A descriptor for the highlight appearance."
    },
    {
      "name": "nodeId",
      "$ref": "NodeId",
      "optional": true,
      "description": "Identifier of the node to highlight."
    },
    {
      "name": "objectId",
      "$ref": "Runtime.RemoteObjectId",
      "optional": true,
      "description": "JavaScript object id of the node to be highlighted."
    }],
    "description": "Highlights DOM node with given id or with the given JavaScript object wrapper. Either nodeId or objectId must be specified."
  },
  {
    "name": "hideHighlight",
    "description": "Hides DOM node highlight."
  },
  {
    "name": "highlightFrame",
    "parameters": [{
      "name": "frameId",
      "$ref": "Network.FrameId",
      "description": "Identifier of the frame to highlight."
    },
    {
      "name": "contentColor",
      "$ref": "RGBA",
      "optional": true,
      "description": "The content box highlight fill color (default: transparent)."
    },
    {
      "name": "contentOutlineColor",
      "$ref": "RGBA",
      "optional": true,
      "description": "The content box highlight outline color (default: transparent)."
    }],
    "description": "Highlights owner element of the frame with given id.",
    "hidden": true
  },
  {
    "name": "pushNodeByPathToFrontend",
    "parameters": [{
      "name": "path",
      "type": "string",
      "description": "Path to node in the proprietary format."
    }],
    "returns": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node for given path."
    }],
    "description": "Requests that the node is sent to the caller given its path. // FIXME, use XPath",
    "hidden": true
  },
  {
    "name": "resolveNode",
    "parameters": [
      { "name": "nodeId", "$ref": "NodeId", "description": "Id of the node to resolve." },
      { "name": "objectGroup", "type": "string", "optional": true, "description": "Symbolic group name that can be used to release multiple objects." }
    ],
    "returns": [{ "name": "object", "$ref": "Runtime.RemoteObject", "description": "JavaScript object wrapper for given node." }],
    "description": "Resolves JavaScript node object for given node id."
  },
  {
    "name": "getAttributes",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to retrieve attibutes for."
    }],
    "returns": [{
      "name": "attributes",
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "An interleaved array of node attribute names and values."
    }],
    "description": "Returns attributes for the specified node."
  },
  {
    "name": "moveTo",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to drop."
    },
    {
      "name": "targetNodeId",
      "$ref": "NodeId",
      "description": "Id of the element to drop into."
    },
    {
      "name": "insertBeforeNodeId",
      "$ref": "NodeId",
      "optional": true,
      "description": "Drop node before given one."
    }],
    "returns": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "New id of the moved node."
    }],
    "description": "Moves node into the new container, places it before the given anchor."
  },
  {
    "name": "undo",
    "description": "Undoes the last performed action.",
    "hidden": true
  },
  {
    "name": "redo",
    "description": "Re-does the last undone action.",
    "hidden": true
  },
  {
    "name": "markUndoableState",
    "description": "Marks last undoable state.",
    "hidden": true
  },
  {
    "name": "focus",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node to focus."
    }],
    "description": "Focuses the given element.",
    "hidden": true
  },
  {
    "name": "setFileInputFiles",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the file input node to set files for."
    },
    {
      "name": "files",
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file paths to set."
    }],
    "description": "Sets files for the given file input element.",
    "hidden": true
  }],
  "events": [{
    "name": "documentUpdated",
    "description": "Fired when <code>Document</code> has been totally updated. Node ids are no longer valid."
  },
  {
    "name": "setChildNodes",
    "parameters": [{
      "name": "parentId",
      "$ref": "NodeId",
      "description": "Parent node id to populate with children."
    },
    {
      "name": "nodes",
      "type": "array",
      "items": {
        "$ref": "Node"
      },
      "description": "Child nodes array."
    }],
    "description": "Fired when backend wants to provide client with the missing DOM structure. This happens upon most of the calls requesting node ids."
  },
  {
    "name": "attributeModified",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has changed."
    },
    {
      "name": "name",
      "type": "string",
      "description": "Attribute name."
    },
    {
      "name": "value",
      "type": "string",
      "description": "Attribute value."
    }],
    "description": "Fired when <code>Element</code>'s attribute is modified."
  },
  {
    "name": "attributeRemoved",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has changed."
    },
    {
      "name": "name",
      "type": "string",
      "description": "A ttribute name."
    }],
    "description": "Fired when <code>Element</code>'s attribute is removed."
  },
  {
    "name": "inlineStyleInvalidated",
    "parameters": [{
      "name": "nodeIds",
      "type": "array",
      "items": {
        "$ref": "NodeId"
      },
      "description": "Ids of the nodes for which the inline styles have been invalidated."
    }],
    "description": "Fired when <code>Element</code>'s inline style is modified via a CSS property modification.",
    "hidden": true
  },
  {
    "name": "characterDataModified",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has changed."
    },
    {
      "name": "characterData",
      "type": "string",
      "description": "New text value."
    }],
    "description": "Mirrors <code>DOMCharacterDataModified</code> event."
  },
  {
    "name": "childNodeCountUpdated",
    "parameters": [{
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has changed."
    },
    {
      "name": "childNodeCount",
      "type": "integer",
      "description": "New node count."
    }],
    "description": "Fired when <code>Container</code>'s child node count has changed."
  },
  {
    "name": "childNodeInserted",
    "parameters": [{
      "name": "parentNodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has changed."
    },
    {
      "name": "previousNodeId",
      "$ref": "NodeId",
      "description": "If of the previous siblint."
    },
    {
      "name": "node",
      "$ref": "Node",
      "description": "Inserted node data."
    }],
    "description": "Mirrors <code>DOMNodeInserted</code> event."
  },
  {
    "name": "childNodeRemoved",
    "parameters": [{
      "name": "parentNodeId",
      "$ref": "NodeId",
      "description": "Parent id."
    },
    {
      "name": "nodeId",
      "$ref": "NodeId",
      "description": "Id of the node that has been removed."
    }],
    "description": "Mirrors <code>DOMNodeRemoved</code> event."
  },
  {
    "name": "shadowRootPushed",
    "parameters": [{
      "name": "hostId",
      "$ref": "NodeId",
      "description": "Host element id."
    },
    {
      "name": "root",
      "$ref": "Node",
      "description": "Shadow root."
    }],
    "description": "Called when shadow root is pushed into the element.",
    "hidden": true
  },
  {
    "name": "shadowRootPopped",
    "parameters": [{
      "name": "hostId",
      "$ref": "NodeId",
      "description": "Host element id."
    },
    {
      "name": "rootId",
      "$ref": "NodeId",
      "description": "Shadow root id."
    }],
    "description": "Called when shadow root is popped from the element.",
    "hidden": true
  }]
}

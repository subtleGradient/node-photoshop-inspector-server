exports.ConsoleServer = ConsoleServer

function ConsoleServer(context){
  this._context = context
}

ConsoleServer.prototype = {
  constructor:ConsoleServer
}

ConsoleServer.prototype.addInspectedNode = function(params, callback, fire){
  var node = this._context.DOM._getNodeFromCache(params.nodeId)
  this._context.photoshop.invoke(
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

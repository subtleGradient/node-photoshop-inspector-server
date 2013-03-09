exports.CSSServer = CSSServer

function CSSServer(context){
  this._context = context
  this._cache = {}
}

CSSServer.prototype = { constructor: CSSServer }

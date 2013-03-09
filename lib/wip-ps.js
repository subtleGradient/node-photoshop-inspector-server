/*jshint asi:true*/

exports.Everything = Everything

function Everything(config){
  this.config = config
  
  this.photoshop = require('./ps-lib/photoshop.node.js')
  
  this.DOM = new (require('./photoshop-wip-DOMServer').DOMServer)(this)
  this.CSS = new (require('./photoshop-wip-CSSServer').CSSServer)(this)
  
  this.Console = new (require('./photoshop-wip-ConsoleServer').ConsoleServer)(this)
  this.Runtime = new (require('./photoshop-wip-RuntimeServer').RuntimeServer)(this)
}

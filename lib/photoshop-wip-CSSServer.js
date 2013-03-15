exports.CSSProperty = CSSProperty

function CSSProperty(){}

CSSProperty.prototype = {
  
  constructor: CSSProperty,
  name:"",
  value:"",
  
}

CSSProperty.protocol = {
    "id": "CSSProperty",
    "type": "object",
    "properties": [
        { "name": "name", "type": "string", "description": "The property name." },
        { "name": "value", "type": "string", "description": "The property value." },
        { "name": "priority", "type": "string", "optional": true, "description": "The property priority (implies \"\" if absent)." },
        { "name": "implicit", "type": "boolean", "optional": true, "description": "Whether the property is implicit (implies <code>false</code> if absent)." },
        { "name": "text", "type": "string", "optional": true, "description": "The full property text as specified in the style." },
        { "name": "parsedOk", "type": "boolean", "optional": true, "description": "Whether the property is understood by the browser (implies <code>true</code> if absent)." },
        { "name": "status", "type": "string", "enum": ["active", "inactive", "disabled", "style"], "optional": true, "description": "The property status: \"active\" if the property is effective in the style, \"inactive\" if the property is overridden by a same-named property in this style later on, \"disabled\" if the property is disabled by the user, \"style\" (implied if absent) if the property is reported by the browser rather than by the CSS source parser." },
        { "name": "range", "$ref": "SourceRange", "optional": true, "description": "The entire property range in the enclosing style declaration (if available)." }
    ],
    "description": "CSS style effective visual dimensions and source offsets."
}

////////////////////////////////////////////////////////////////////////////////

exports.CSSStyle = CSSStyle

function CSSStyle(object, id, prefix){
  if (!prefix) prefix = ''
  if (id) this.styleId = {styleSheetId:JSON.stringify(id), ordinal:0}
  
  var cssProperties = this.cssProperties = this.shorthandEntries = []
  if (!(object && typeof object == 'object')) return;
  
  Object.keys(object).forEach(function(key){
    // switch(typeof object[key]){
    // case 'string':
    //   break;
    // default:
    // }
    var value = object[key]
    if (key == 'color' && typeof value == 'object')
      value = cssHelper._layerColorToCSSColor(value)
    else
      value = JSON.stringify(value)
    
    cssProperties.push({name:prefix + key, value:value})
  }, this)
}

CSSStyle.prototype = {constructor:CSSStyle}

CSSStyle.protocol = {
    "id": "CSSStyle",
    "type": "object",
    "properties": [
        { "name": "styleId", "$ref": "CSSStyleId", "optional": true,
        "description": "The CSS style identifier (absent for attribute styles)." },
        
        { "name": "cssProperties", "type": "array", "items": { "$ref": "CSSProperty" },
        "description": "CSS properties in the style." },
        
        { "name": "shorthandEntries", "type": "array", "items": { "$ref": "ShorthandEntry" },
        "description": "Computed values for all shorthands found in the style." },
        
        { "name": "cssText", "type": "string", "optional": true,
        "description": "Style declaration text (if available)." },
        
        { "name": "range", "$ref": "SourceRange", "optional": true,
        "description": "Style declaration range in the enclosing stylesheet (if available)." },
        
        { "name": "width", "type": "string", "optional": true,
        "description": "The effective \"width\" property value from this style." },
        
        { "name": "height", "type": "string", "optional": true,
        "description": "The effective \"height\" property value from this style." }
    ],
    "description": "CSS style representation."
}

////////////////////////////////////////////////////////////////////////////////

exports.CSSServer = CSSServer

function CSSServer(context){
  this._context = context
  this._cache = {}
}

var CSS = CSSServer.prototype = { constructor: CSSServer }

CSS.enable = function(params, callback, fire){
  callback()
}

CSS.getSupportedCSSProperties = function(params, callback, fire){
  callback(null, {cssProperties:CSSPropertyInfo})
}

var cssHelper = require('./css')

CSS.getInlineStylesForNode_protocol = {
  "name": "getInlineStylesForNode",
  "parameters": [
    { "name": "nodeId", "$ref": "DOM.NodeId" }
  ],
  "returns": [
    { "name": "inlineStyle", "$ref": "CSSStyle", "optional": true, "description": "Inline style for the specified DOM node." },
    { "name": "attributesStyle", "$ref": "CSSStyle", "optional": true, "description": "Attribute-defined element style (e.g. resulting from \"width=20 height=100%\")."}
  ],
  "description": "Returns the styles defined inline (explicitly in the \"style\" attribute and implicitly, using DOM attributes) for a DOM node identified by <code>nodeId</code>."
}

CSS._layerPropertyBlacklist = {
  targetChannels:1,
  visibleChannels:1,
  channelRestrictions:1,
}

CSS.getInlineStylesForNode = function(params, callback, fire){
  var css = this;
  css.getInlineStylesForNode_running = true
  
  css._context.photoshop.invoke(
    function(layerID){
      return PSFakeDOM.executeActionGet(PSFakeDOM.getLayerRefById(layerID))
    },
    params.nodeId,
    function(error, layer){
      css.getInlineStylesForNode_running = false
      if (error) return callback(error);
      if (!(layer && layer.bounds))  return callback(Error('layer with layerID:"' + params.nodeId + '" not found'));
      
      Object.keys(css._layerPropertyBlacklist).forEach(function(key){delete this[key]}, layer)
      
      css._theLayerWeAreCurrentlyInspectingRightNowAtThisVeryMomentAndStuffHashTagDotComTwoPointOhBeta = layer
      
      var result = {
        "inlineStyle": css._inlineStyleForLayer(layer),
        "attributesStyle": css._attributesStyleForLayer(layer),
      }
      
      callback(null, result)
    }
  )
}

CSS._inlineStyleForLayer = function(layer){
  var editableProperties = {
    id: layer.layerID,
    name: layer.name,
    'z-index': layer.itemIndex,
    left: layer.bounds.left,
    top: layer.bounds.top,
    width: layer.bounds.width,
    height: layer.bounds.height,
    visibility: layer.visible ? 'visible' : 'hidden',
    opacity: Math.round(layer.opacity / 0xFF * 100) / 100,
  }
  return new CSSStyle(editableProperties, {nodeId:layer.layerID, key:'editableProperties'})
}

CSS._attributesStyleForLayer = function(layer){
  return new CSSStyle(Object_flatten(layer), {nodeId:layer.layerID}, '-ps-')
}

// CSS.getComputedStyleForNode = function(params, callback, fire){}


CSS.getMatchedStylesForNode_protocol = {
  "name": "getMatchedStylesForNode",
  "parameters": [
    { "name": "nodeId", "$ref": "DOM.NodeId" },
    { "name": "includePseudo", "type": "boolean", "optional": true, "description": "Whether to include pseudo styles (default: true)." },
    { "name": "includeInherited", "type": "boolean", "optional": true, "description": "Whether to include inherited styles (default: true)." }
  ],
  "returns": [
    { "name": "matchedCSSRules", "type": "array", "items": { "$ref": "RuleMatch" }, "optional": true, "description": "CSS rules matching this node, from all applicable stylesheets." },
    { "name": "pseudoElements", "type": "array", "items": { "$ref": "PseudoIdMatches" }, "optional": true, "description": "Pseudo style matches for this node." },
    { "name": "inherited", "type": "array", "items": { "$ref": "InheritedStyleEntry" }, "optional": true, "description": "A chain of inherited styles (from the immediate node parent up to the DOM tree root)." }
  ],
  "description": "Returns requested styles for a DOM node identified by <code>nodeId</code>."
}

CSS.getMatchedStylesForNode = function(params, callback, fire){
  var self = this;
  // Because of a race condition on the most popular client, we have to make sure that getComputedStyleForNode and getInlineStylesForNode return first
  // Cf. StylesSidebarPane.js
  var realCallback = callback
  callback = function(error, result){
    if (self.getInlineStylesForNode_running || self.getComputedStyleForNode_running) return setTimeout(function(){callback(error, result)}, 50);
    realCallback(error, result)
  }
  
  var layer = self._theLayerWeAreCurrentlyInspectingRightNowAtThisVeryMomentAndStuffHashTagDotComTwoPointOhBeta
  if (!(layer && layer.layerID == params.nodeId)){
    self._context.photoshop.invoke(
      function(layerID){ return PSFakeDOM.executeActionGet(PSFakeDOM.getLayerRefById(layerID)) },
      params.nodeId,
      doTheThing
    )
  }
  else doTheThing(null, layer)
  
  function doTheThing(error, layer){
    if (error) return callback(error);
    var theThings = {matchedCSSRules:[], pseudoElements:[], inherited:[], }
    var rule, styles
    
/*
    if (typeof layer.layerEffects == 'object'){
      styles = {
        hasFilterMask: layer.hasFilterMask,
        layerFXVisible: layer.layerFXVisible,
      }
      Object.keys(layer.layerEffects).forEach(function(layerEffectName){
        var layerEffect = layer.layerEffects[layerEffectName]
        if (typeof layerEffect != 'object') {
          styles['layerEffect-' + layerEffectName] = layerEffect;
          return;
        }
        styles[layerEffectName + '-enabled'] = layerEffect.enabled
        theThings.matchedCSSRules.push(createRuleMatch(layer, '.layerEffects.' + layerEffectName, layerEffect, layerEffectName+'-'));
      })
      theThings.matchedCSSRules.unshift(createRuleMatch(layer, '.layerEffects', styles));
      styles = null
    }
    if (layer.adjustment && layer.adjustment.length){
      layer.adjustment.forEach(function(adjustment, index){
        theThings.matchedCSSRules.push(createRuleMatch(layer, '.adjustment[' + index + ']', layer.adjustment[index], 'adjustment-' + index + '-'))
      })
    }
    if (layer.textKey){
      layer.textKey.textStyleRange.slice().forEach(function(textStyleRange, index){
        var style = textStyleRange.textStyle
        style.text = layer.textKey.textKey.substring(textStyleRange.from, textStyleRange.to)
        theThings.matchedCSSRules.unshift(createRuleMatch(layer, '.textStyleRange[' + index + ']', style, 'textStyleRange-' + index + '-'))
      })
    }
*/
  
    callback(null, theThings)
  }
}


CSS.setPropertyText_protocol = {
    "name": "setPropertyText",
    "parameters": [
        { "name": "styleId", "$ref": "CSSStyleId" },
        { "name": "propertyIndex", "type": "integer" },
        { "name": "text", "type": "string" },
        { "name": "overwrite", "type": "boolean" }
    ],
    "returns": [
        { "name": "style", "$ref": "CSSStyle", "description": "The resulting style after the property text modification." }
    ],
    "description": "Sets the new <code>text</code> for a property in the respective style, at offset <code>propertyIndex</code>. If <code>overwrite</code> is <code>true</code>, a property at the given offset is overwritten, otherwise inserted. <code>text</code> entirely replaces the property <code>name: value</code>."
}

// CSS['set ']

CSS.setPropertyText = function(params, callback, fire){
  throw Error('not implemented')
}

function createRuleMatch(layer, selector, styles, prefix){
  var selectors = ['#' + layer.layerID + selector]
  var ruleMatch = /*RuleMatch*/{
    rule:/*CSSRule*/{
      // "ruleId": /*CSSRuleId*/{
      //   styleSheetId: /*StyleSheetId*/JSON.stringify,
      //   ordinal: ordinal,
      // },
      "selectorList": /*SelectorList*/{ selectors: selectors, text: selectors.join(', '), },
      "sourceURL": selectors.join(''),
      "sourceLine": 0,
      "origin": /*StyleSheetOrigin*/"regular",
      "style": new CSSStyle(styles, {nodeId:layer.layerID, key:selector}, prefix),
      // "media": [],
    },
    matchingSelectors:[0],
  }
  
  return ruleMatch
}

function Object_flatten(object, flatObject, prefix){
  if (!prefix) prefix = ''
  if (flatObject == null) flatObject = {}
  var value
  for (var property in object) {
    value = object[property]
    if (!(value && typeof value == 'object')){
      flatObject[prefix + property] = object[property]
      continue;
    }
    else {
      Object_flatten(object[property], flatObject, prefix + property + '.')
    }
  }
  return flatObject
}

if (!module.parent)(function(){
  
  var nested = {1:1, 2:2, 3:3, array:[1,2,3], object:{1:1,2:2,3:3}, null:null }
  
  var foo = Object_flatten(JSON.parse(JSON.stringify( nested )))
  console.log(foo)
  
  // console.assert(false)
  
}())

var CSSPropertyInfo = [
  {"name":"alignment-baseline"},
  {"name":"background","longhands":["background-image","background-position-x","background-position-y","background-size","background-repeat-x","background-repeat-y","background-attachment","background-origin","background-clip","background-color"]},
  {"name":"background-attachment"},
  {"name":"background-clip"},
  {"name":"background-color"},
  {"name":"background-image"},
  {"name":"background-origin"},
  {"name":"background-position","longhands":["background-position-x","background-position-y"]},
  {"name":"background-position-x"},
  {"name":"background-position-y"},
  {"name":"background-repeat","longhands":["background-repeat-x","background-repeat-y"]},
  {"name":"background-repeat-x"},
  {"name":"background-repeat-y"},
  {"name":"background-size"},
  {"name":"baseline-shift"},
  {"name":"border","longhands":["border-top-color","border-top-style","border-top-width","border-right-color","border-right-style","border-right-width","border-bottom-color","border-bottom-style","border-bottom-width","border-left-color","border-left-style","border-left-width"]},
  {"name":"border-bottom","longhands":["border-bottom-width","border-bottom-style","border-bottom-color"]},
  {"name":"border-bottom-color"},
  {"name":"border-bottom-left-radius"},
  {"name":"border-bottom-right-radius"},
  {"name":"border-bottom-style"},
  {"name":"border-bottom-width"},
  {"name":"border-collapse"},
  {"name":"border-color","longhands":["border-top-color","border-right-color","border-bottom-color","border-left-color"]},
  {"name":"border-image","longhands":["border-image-source","border-image-slice","border-image-width","border-image-outset","border-image-repeat"]},
  {"name":"border-image-outset"},
  {"name":"border-image-repeat"},
  {"name":"border-image-slice"},
  {"name":"border-image-source"},
  {"name":"border-image-width"},
  {"name":"border-left","longhands":["border-left-width","border-left-style","border-left-color"]},
  {"name":"border-left-color"},
  {"name":"border-left-style"},
  {"name":"border-left-width"},
  {"name":"border-radius","longhands":["border-top-right-radius","border-top-left-radius","border-bottom-left-radius","border-bottom-right-radius"]},
  {"name":"border-right","longhands":["border-right-width","border-right-style","border-right-color"]},
  {"name":"border-right-color"},
  {"name":"border-right-style"},
  {"name":"border-right-width"},
  {"name":"border-spacing","longhands":["-webkit-border-horizontal-spacing","-webkit-border-vertical-spacing"]},
  {"name":"border-style","longhands":["border-top-style","border-right-style","border-bottom-style","border-left-style"]},
  {"name":"border-top","longhands":["border-top-width","border-top-style","border-top-color"]},
  {"name":"border-top-color"},
  {"name":"border-top-left-radius"},
  {"name":"border-top-right-radius"},
  {"name":"border-top-style"},
  {"name":"border-top-width"},
  {"name":"border-width","longhands":["border-top-width","border-right-width","border-bottom-width","border-left-width"]},
  {"name":"bottom"},
  {"name":"box-shadow"},
  {"name":"box-sizing"},
  {"name":"caption-side"},
  {"name":"clear"},
  {"name":"clip"},
  {"name":"clip-path"},
  {"name":"clip-rule"},
  {"name":"color"},
  {"name":"color-interpolation"},
  {"name":"color-interpolation-filters"},
  {"name":"color-profile"},
  {"name":"color-rendering"},
  {"name":"content"},
  {"name":"counter-increment"},
  {"name":"counter-reset"},
  {"name":"cursor"},
  {"name":"direction"},
  {"name":"display"},
  {"name":"dominant-baseline"},
  {"name":"empty-cells"},
  {"name":"enable-background"},
  {"name":"fill"},
  {"name":"fill-opacity"},
  {"name":"fill-rule"},
  {"name":"filter"},
  {"name":"float"},
  {"name":"flood-color"},
  {"name":"flood-opacity"},
  {"name":"font","longhands":["font-family","font-size","font-style","font-variant","font-weight","line-height"]},
  {"name":"font-family"},
  {"name":"font-size"},
  {"name":"font-stretch"},
  {"name":"font-style"},
  {"name":"font-variant"},
  {"name":"font-weight"},
  {"name":"glyph-orientation-horizontal"},
  {"name":"glyph-orientation-vertical"},
  {"name":"height"},
  {"name":"image-rendering"},
  {"name":"kerning"},
  {"name":"left"},
  {"name":"letter-spacing"},
  {"name":"lighting-color"},
  {"name":"line-height"},
  {"name":"list-style","longhands":["list-style-type","list-style-position","list-style-image"]},
  {"name":"list-style-image"},
  {"name":"list-style-position"},
  {"name":"list-style-type"},
  {"name":"margin","longhands":["margin-top","margin-right","margin-bottom","margin-left"]},
  {"name":"margin-bottom"},
  {"name":"margin-left"},
  {"name":"margin-right"},
  {"name":"margin-top"},
  {"name":"marker"},
  {"name":"marker-end"},
  {"name":"marker-mid"},
  {"name":"marker-start"},
  {"name":"mask"},
  {"name":"mask-type"},
  {"name":"max-height"},
  {"name":"max-width"},
  {"name":"min-height"},
  {"name":"min-width"},
  {"name":"opacity"},
  {"name":"orphans"},
  {"name":"outline","longhands":["outline-color","outline-style","outline-width"]},
  {"name":"outline-color"},
  {"name":"outline-offset"},
  {"name":"outline-style"},
  {"name":"outline-width"},
  {"name":"overflow","longhands":["overflow-x","overflow-y"]},
  {"name":"overflow-wrap"},
  {"name":"overflow-x"},
  {"name":"overflow-y"},
  {"name":"padding","longhands":["padding-top","padding-right","padding-bottom","padding-left"]},
  {"name":"padding-bottom"},
  {"name":"padding-left"},
  {"name":"padding-right"},
  {"name":"padding-top"},
  {"name":"page"},
  {"name":"page-break-after"},
  {"name":"page-break-before"},
  {"name":"page-break-inside"},
  {"name":"pointer-events"},
  {"name":"position"},
  {"name":"quotes"},
  {"name":"resize"},
  {"name":"right"},
  {"name":"shape-rendering"},
  {"name":"size"},
  {"name":"speak"},
  {"name":"src"},
  {"name":"stop-color"},
  {"name":"stop-opacity"},
  {"name":"stroke"},
  {"name":"stroke-dasharray"},
  {"name":"stroke-dashoffset"},
  {"name":"stroke-linecap"},
  {"name":"stroke-linejoin"},
  {"name":"stroke-miterlimit"},
  {"name":"stroke-opacity"},
  {"name":"stroke-width"},
  {"name":"tab-size"},
  {"name":"table-layout"},
  {"name":"text-align"},
  {"name":"text-anchor"},
  {"name":"text-decoration"},
  {"name":"text-indent"},
  {"name":"text-line-through"},
  {"name":"text-line-through-color"},
  {"name":"text-line-through-mode"},
  {"name":"text-line-through-style"},
  {"name":"text-line-through-width"},
  {"name":"text-overflow"},
  {"name":"text-overline"},
  {"name":"text-overline-color"},
  {"name":"text-overline-mode"},
  {"name":"text-overline-style"},
  {"name":"text-overline-width"},
  {"name":"text-rendering"},
  {"name":"text-shadow"},
  {"name":"text-transform"},
  {"name":"text-underline"},
  {"name":"text-underline-color"},
  {"name":"text-underline-mode"},
  {"name":"text-underline-style"},
  {"name":"text-underline-width"},
  {"name":"top"},
  {"name":"transition","longhands":["transition-property","transition-duration","transition-timing-function","transition-delay"]},
  {"name":"transition-delay"},
  {"name":"transition-duration"},
  {"name":"transition-property"},
  {"name":"transition-timing-function"},
  {"name":"unicode-bidi"},
  {"name":"unicode-range"},
  {"name":"vector-effect"},
  {"name":"vertical-align"},
  {"name":"visibility"},
  {"name":"white-space"},
  {"name":"widows"},
  {"name":"width"},
  {"name":"word-break"},
  {"name":"word-spacing"},
  {"name":"word-wrap"},
  {"name":"writing-mode"},
  {"name":"z-index"},
  {"name":"zoom"},

  {"name":"-webkit-align-content"},
  {"name":"-webkit-align-items"},
  {"name":"-webkit-align-self"},
  {"name":"-webkit-animation","longhands":["-webkit-animation-name","-webkit-animation-duration","-webkit-animation-timing-function","-webkit-animation-delay","-webkit-animation-iteration-count","-webkit-animation-direction","-webkit-animation-fill-mode"]},
  {"name":"-webkit-animation-delay"},
  {"name":"-webkit-animation-direction"},
  {"name":"-webkit-animation-duration"},
  {"name":"-webkit-animation-fill-mode"},
  {"name":"-webkit-animation-iteration-count"},
  {"name":"-webkit-animation-name"},
  {"name":"-webkit-animation-play-state"},
  {"name":"-webkit-animation-timing-function"},
  {"name":"-webkit-app-region"},
  {"name":"-webkit-appearance"},
  {"name":"-webkit-aspect-ratio"},
  {"name":"-webkit-backface-visibility"},
  {"name":"-webkit-background-clip"},
  {"name":"-webkit-background-composite"},
  {"name":"-webkit-background-origin"},
  {"name":"-webkit-background-size"},
  {"name":"-webkit-border-after","longhands":["-webkit-border-after-width","-webkit-border-after-style","-webkit-border-after-color"]},
  {"name":"-webkit-border-after-color"},
  {"name":"-webkit-border-after-style"},
  {"name":"-webkit-border-after-width"},
  {"name":"-webkit-border-before","longhands":["-webkit-border-before-width","-webkit-border-before-style","-webkit-border-before-color"]},
  {"name":"-webkit-border-before-color"},
  {"name":"-webkit-border-before-style"},
  {"name":"-webkit-border-before-width"},
  {"name":"-webkit-border-end","longhands":["-webkit-border-end-width","-webkit-border-end-style","-webkit-border-end-color"]},
  {"name":"-webkit-border-end-color"},
  {"name":"-webkit-border-end-style"},
  {"name":"-webkit-border-end-width"},
  {"name":"-webkit-border-fit"},
  {"name":"-webkit-border-horizontal-spacing"},
  {"name":"-webkit-border-image"},
  {"name":"-webkit-border-radius","longhands":["border-top-right-radius","border-top-left-radius","border-bottom-left-radius","border-bottom-right-radius"]},
  {"name":"-webkit-border-start","longhands":["-webkit-border-start-width","-webkit-border-start-style","-webkit-border-start-color"]},
  {"name":"-webkit-border-start-color"},
  {"name":"-webkit-border-start-style"},
  {"name":"-webkit-border-start-width"},
  {"name":"-webkit-border-vertical-spacing"},
  {"name":"-webkit-box-align"},
  {"name":"-webkit-box-decoration-break"},
  {"name":"-webkit-box-direction"},
  {"name":"-webkit-box-flex"},
  {"name":"-webkit-box-flex-group"},
  {"name":"-webkit-box-lines"},
  {"name":"-webkit-box-ordinal-group"},
  {"name":"-webkit-box-orient"},
  {"name":"-webkit-box-pack"},
  {"name":"-webkit-box-reflect"},
  {"name":"-webkit-box-shadow"},
  {"name":"-webkit-clip-path"},
  {"name":"-webkit-color-correction"},
  {"name":"-webkit-column-axis"},
  {"name":"-webkit-column-break-after"},
  {"name":"-webkit-column-break-before"},
  {"name":"-webkit-column-break-inside"},
  {"name":"-webkit-column-count"},
  {"name":"-webkit-column-gap"},
  {"name":"-webkit-column-progression"},
  {"name":"-webkit-column-rule","longhands":["-webkit-column-rule-width","-webkit-column-rule-style","-webkit-column-rule-color"]},
  {"name":"-webkit-column-rule-color"},
  {"name":"-webkit-column-rule-style"},
  {"name":"-webkit-column-rule-width"},
  {"name":"-webkit-column-span"},
  {"name":"-webkit-column-width"},
  {"name":"-webkit-columns","longhands":["-webkit-column-width","-webkit-column-count"]},
  {"name":"-webkit-filter"},
  {"name":"-webkit-flex","longhands":["-webkit-flex-grow","-webkit-flex-shrink","-webkit-flex-basis"]},
  {"name":"-webkit-flex-basis"},
  {"name":"-webkit-flex-direction"},
  {"name":"-webkit-flex-flow","longhands":["-webkit-flex-direction","-webkit-flex-wrap"]},
  {"name":"-webkit-flex-grow"},
  {"name":"-webkit-flex-shrink"},
  {"name":"-webkit-flex-wrap"},
  {"name":"-webkit-flow-from"},
  {"name":"-webkit-flow-into"},
  {"name":"-webkit-font-feature-settings"},
  {"name":"-webkit-font-kerning"},
  {"name":"-webkit-font-size-delta"},
  {"name":"-webkit-font-smoothing"},
  {"name":"-webkit-font-variant-ligatures"},
  {"name":"-webkit-grid-after"},
  {"name":"-webkit-grid-auto-flow"},
  {"name":"-webkit-grid-before"},
  {"name":"-webkit-grid-column","longhands":["-webkit-grid-start","-webkit-grid-end"]},
  {"name":"-webkit-grid-columns"},
  {"name":"-webkit-grid-end"},
  {"name":"-webkit-grid-row","longhands":["-webkit-grid-before","-webkit-grid-after"]},
  {"name":"-webkit-grid-rows"},
  {"name":"-webkit-grid-start"},
  {"name":"-webkit-highlight"},
  {"name":"-webkit-hyphenate-character"},
  {"name":"-webkit-hyphenate-limit-after"},
  {"name":"-webkit-hyphenate-limit-before"},
  {"name":"-webkit-hyphenate-limit-lines"},
  {"name":"-webkit-hyphens"},
  {"name":"-webkit-justify-content"},
  {"name":"-webkit-line-align"},
  {"name":"-webkit-line-box-contain"},
  {"name":"-webkit-line-break"},
  {"name":"-webkit-line-clamp"},
  {"name":"-webkit-line-grid"},
  {"name":"-webkit-line-snap"},
  {"name":"-webkit-locale"},
  {"name":"-webkit-logical-height"},
  {"name":"-webkit-logical-width"},
  {"name":"-webkit-margin-after"},
  {"name":"-webkit-margin-after-collapse"},
  {"name":"-webkit-margin-before"},
  {"name":"-webkit-margin-before-collapse"},
  {"name":"-webkit-margin-bottom-collapse"},
  {"name":"-webkit-margin-collapse","longhands":["-webkit-margin-before-collapse","-webkit-margin-after-collapse"]},
  {"name":"-webkit-margin-end"},
  {"name":"-webkit-margin-start"},
  {"name":"-webkit-margin-top-collapse"},
  {"name":"-webkit-marquee","longhands":["-webkit-marquee-direction","-webkit-marquee-increment","-webkit-marquee-repetition","-webkit-marquee-style","-webkit-marquee-speed"]},
  {"name":"-webkit-marquee-direction"},
  {"name":"-webkit-marquee-increment"},
  {"name":"-webkit-marquee-repetition"},
  {"name":"-webkit-marquee-speed"},
  {"name":"-webkit-marquee-style"},
  {"name":"-webkit-mask","longhands":["-webkit-mask-image","-webkit-mask-position-x","-webkit-mask-position-y","-webkit-mask-size","-webkit-mask-repeat-x","-webkit-mask-repeat-y","-webkit-mask-origin","-webkit-mask-clip"]},
  {"name":"-webkit-mask-box-image"},
  {"name":"-webkit-mask-box-image-outset"},
  {"name":"-webkit-mask-box-image-repeat"},
  {"name":"-webkit-mask-box-image-slice"},
  {"name":"-webkit-mask-box-image-source"},
  {"name":"-webkit-mask-box-image-width"},
  {"name":"-webkit-mask-clip"},
  {"name":"-webkit-mask-composite"},
  {"name":"-webkit-mask-image"},
  {"name":"-webkit-mask-origin"},
  {"name":"-webkit-mask-position","longhands":["-webkit-mask-position-x","-webkit-mask-position-y"]},
  {"name":"-webkit-mask-position-x"},
  {"name":"-webkit-mask-position-y"},
  {"name":"-webkit-mask-repeat","longhands":["-webkit-mask-repeat-x","-webkit-mask-repeat-y"]},
  {"name":"-webkit-mask-repeat-x"},
  {"name":"-webkit-mask-repeat-y"},
  {"name":"-webkit-mask-size"},
  {"name":"-webkit-max-logical-height"},
  {"name":"-webkit-max-logical-width"},
  {"name":"-webkit-min-logical-height"},
  {"name":"-webkit-min-logical-width"},
  {"name":"-webkit-nbsp-mode"},
  {"name":"-webkit-order"},
  {"name":"-webkit-padding-after"},
  {"name":"-webkit-padding-before"},
  {"name":"-webkit-padding-end"},
  {"name":"-webkit-padding-start"},
  {"name":"-webkit-perspective"},
  {"name":"-webkit-perspective-origin"},
  {"name":"-webkit-perspective-origin-x"},
  {"name":"-webkit-perspective-origin-y"},
  {"name":"-webkit-print-color-adjust"},
  {"name":"-webkit-region-break-after"},
  {"name":"-webkit-region-break-before"},
  {"name":"-webkit-region-break-inside"},
  {"name":"-webkit-region-overflow"},
  {"name":"-webkit-rtl-ordering"},
  {"name":"-webkit-ruby-position"},
  {"name":"-webkit-shape-inside"},
  {"name":"-webkit-shape-margin"},
  {"name":"-webkit-shape-outside"},
  {"name":"-webkit-shape-padding"},
  {"name":"-webkit-svg-shadow"},
  {"name":"-webkit-tap-highlight-color"},
  {"name":"-webkit-text-combine"},
  {"name":"-webkit-text-decorations-in-effect"},
  {"name":"-webkit-text-emphasis","longhands":["-webkit-text-emphasis-style","-webkit-text-emphasis-color"]},
  {"name":"-webkit-text-emphasis-color"},
  {"name":"-webkit-text-emphasis-position"},
  {"name":"-webkit-text-emphasis-style"},
  {"name":"-webkit-text-fill-color"},
  {"name":"-webkit-text-orientation"},
  {"name":"-webkit-text-security"},
  {"name":"-webkit-text-size-adjust"},
  {"name":"-webkit-text-stroke","longhands":["-webkit-text-stroke-width","-webkit-text-stroke-color"]},
  {"name":"-webkit-text-stroke-color"},
  {"name":"-webkit-text-stroke-width"},
  {"name":"-webkit-transform"},
  {"name":"-webkit-transform-origin","longhands":["-webkit-transform-origin-x","-webkit-transform-origin-y","-webkit-transform-origin-z"]},
  {"name":"-webkit-transform-origin-x"},
  {"name":"-webkit-transform-origin-y"},
  {"name":"-webkit-transform-origin-z"},
  {"name":"-webkit-transform-style"},
  {"name":"-webkit-transition","longhands":["-webkit-transition-property","-webkit-transition-duration","-webkit-transition-timing-function","-webkit-transition-delay"]},
  {"name":"-webkit-transition-delay"},
  {"name":"-webkit-transition-duration"},
  {"name":"-webkit-transition-property"},
  {"name":"-webkit-transition-timing-function"},
  {"name":"-webkit-user-drag"},
  {"name":"-webkit-user-modify"},
  {"name":"-webkit-user-select"},
  {"name":"-webkit-wrap","longhands":["-webkit-wrap-flow","-webkit-shape-margin","-webkit-shape-padding"]},
  {"name":"-webkit-wrap-flow"},
  {"name":"-webkit-wrap-through"},
  {"name":"-webkit-writing-mode"},
]

////////////////////////////////////////////////////////////////////////////////

exports.protocol = {
    "domain": "CSS",
    "hidden": true,
    "description": "This domain exposes CSS read/write operations. All CSS objects, like stylesheets, rules, and styles, have an associated <code>id</code> used in subsequent operations on the related object. Each object type has a specific <code>id</code> structure, and those are not interchangeable between objects of different kinds. CSS objects can be loaded using the <code>get*ForNode()</code> calls (which accept a DOM node id). Alternatively, a client can discover all the existing stylesheets with the <code>getAllStyleSheets()</code> method and subsequently load the required stylesheet contents using the <code>getStyleSheet[Text]()</code> methods.",
    "types": [
        {
            "id": "StyleSheetId",
            "type": "string"
        },
        {
            "id": "CSSStyleId",
            "type": "object",
            "properties": [
                { "name": "styleSheetId", "$ref": "StyleSheetId", "description": "Enclosing stylesheet identifier." },
                { "name": "ordinal", "type": "integer", "description": "The style ordinal within the stylesheet." }
            ],
            "description": "This object identifies a CSS style in a unique way."
        },
        {
            "id": "StyleSheetOrigin",
            "type": "string",
            "enum": ["user", "user-agent", "inspector", "regular"],
            "description": "Stylesheet type: \"user\" for user stylesheets, \"user-agent\" for user-agent stylesheets, \"inspector\" for stylesheets created by the inspector (i.e. those holding the \"via inspector\" rules), \"regular\" for regular stylesheets."
        },
        {
            "id": "CSSRuleId",
            "type": "object",
            "properties": [
                { "name": "styleSheetId", "$ref": "StyleSheetId", "description": "Enclosing stylesheet identifier." },
                { "name": "ordinal", "type": "integer", "description": "The rule ordinal within the stylesheet." }
            ],
            "description": "This object identifies a CSS rule in a unique way."
        },
        {
            "id": "PseudoIdMatches",
            "type": "object",
            "properties": [
                { "name": "pseudoId", "type": "integer", "description": "Pseudo style identifier (see <code>enum PseudoId</code> in <code>RenderStyleConstants.h</code>)."},
                { "name": "matches", "type": "array", "items": { "$ref": "RuleMatch" }, "description": "Matches of CSS rules applicable to the pseudo style."}
            ],
            "description": "CSS rule collection for a single pseudo style."
        },
        {
            "id": "InheritedStyleEntry",
            "type": "object",
            "properties": [
                { "name": "inlineStyle", "$ref": "CSSStyle", "optional": true, "description": "The ancestor node's inline style, if any, in the style inheritance chain." },
                { "name": "matchedCSSRules", "type": "array", "items": { "$ref": "RuleMatch" }, "description": "Matches of CSS rules matching the ancestor node in the style inheritance chain." }
            ],
            "description": "CSS rule collection for a single pseudo style."
        },
        {
            "id": "RuleMatch",
            "type": "object",
            "properties": [
                { "name": "rule", "$ref": "CSSRule", "description": "CSS rule in the match." },
                { "name": "matchingSelectors", "type": "array", "items": { "type": "integer" }, "description": "Matching selector indices in the rule's selectorList selectors (0-based)." }
            ],
            "description": "Match data for a CSS rule."
        },
        {
            "id": "SelectorList",
            "type": "object",
            "properties": [
                { "name": "selectors", "type": "array", "items": { "type": "string" }, "description": "Selectors in the list." },
                { "name": "text", "type": "string", "description": "Rule selector text." },
                { "name": "range", "$ref": "SourceRange", "optional": true, "description": "Rule selector range in the underlying resource (if available)." }
            ],
            "description": "Selector list data."
        },
        {
            "id": "CSSStyleAttribute",
            "type": "object",
            "properties": [
                { "name": "name", "type": "string", "description": "DOM attribute name (e.g. \"width\")."},
                { "name": "style", "$ref": "CSSStyle", "description": "CSS style generated by the respective DOM attribute."}
            ],
            "description": "CSS style information for a DOM style attribute."
        },
        {
            "id": "CSSStyleSheetHeader",
            "type": "object",
            "properties": [
                { "name": "styleSheetId", "$ref": "StyleSheetId", "description": "The stylesheet identifier."},
                { "name": "frameId", "$ref": "Network.FrameId", "description": "Owner frame identifier."},
                { "name": "sourceURL", "type": "string", "description": "Stylesheet resource URL."},
                { "name": "origin", "$ref": "StyleSheetOrigin", "description": "Stylesheet origin."},
                { "name": "title", "type": "string", "description": "Stylesheet title."},
                { "name": "disabled", "type": "boolean", "description": "Denotes whether the stylesheet is disabled."}
            ],
            "description": "CSS stylesheet metainformation."
        },
        {
            "id": "CSSStyleSheetBody",
            "type": "object",
            "properties": [
                { "name": "styleSheetId", "$ref": "StyleSheetId", "description": "The stylesheet identifier."},
                { "name": "rules", "type": "array", "items": { "$ref": "CSSRule" }, "description": "Stylesheet resource URL."},
                { "name": "text", "type": "string", "optional": true, "description": "Stylesheet resource contents (if available)."}
            ],
            "description": "CSS stylesheet contents."
        },
        {
            "id": "CSSRule",
            "type": "object",
            "properties": [
                { "name": "ruleId", "$ref": "CSSRuleId", "optional": true, "description": "The CSS rule identifier (absent for user agent stylesheet and user-specified stylesheet rules)."},
                { "name": "selectorList", "$ref": "SelectorList", "description": "Rule selector data." },
                { "name": "sourceURL", "type": "string", "optional": true, "description": "Parent stylesheet resource URL (for regular rules)."},
                { "name": "sourceLine", "type": "integer", "description": "Line ordinal of the rule selector start character in the resource."},
                { "name": "origin", "$ref": "StyleSheetOrigin", "description": "Parent stylesheet's origin."},
                { "name": "style", "$ref": "CSSStyle", "description": "Associated style declaration." },
                { "name": "media", "type": "array", "items": { "$ref": "CSSMedia" }, "optional": true, "description": "Media list array (for rules involving media queries). The array enumerates media queries starting with the innermost one, going outwards." }
            ],
            "description": "CSS rule representation."
        },
        {
            "id": "SourceRange",
            "type": "object",
            "properties": [
                { "name": "startLine", "type": "integer", "description": "Start line of range." },
                { "name": "startColumn", "type": "integer", "description": "Start column of range (inclusive)." },
                { "name": "endLine", "type": "integer", "description": "End line of range" },
                { "name": "endColumn", "type": "integer", "description": "End column of range (exclusive)." }
            ],
            "description": "Text range within a resource."
        },
        {
            "id": "ShorthandEntry",
            "type": "object",
            "properties": [
                { "name": "name", "type": "string", "description": "Shorthand name." },
                { "name": "value", "type": "string", "description": "Shorthand value." }
            ]
        },
        {
            "id": "CSSPropertyInfo",
            "type": "object",
            "properties": [
                { "name": "name", "type": "string", "description": "Property name." },
                { "name": "longhands", "type": "array", "optional": true, "items": { "type": "string" }, "description": "Longhand property names." }
            ]
        },
        {
            "id": "CSSComputedStyleProperty",
            "type": "object",
            "properties": [
                { "name": "name", "type": "string", "description": "Computed style property name." },
                { "name": "value", "type": "string", "description": "Computed style property value." }
            ]
        },
        {
            "id": "CSSStyle",
            "type": "object",
            "properties": [
                { "name": "styleId", "$ref": "CSSStyleId", "optional": true, "description": "The CSS style identifier (absent for attribute styles)." },
                { "name": "cssProperties", "type": "array", "items": { "$ref": "CSSProperty" }, "description": "CSS properties in the style." },
                { "name": "shorthandEntries", "type": "array", "items": { "$ref": "ShorthandEntry" }, "description": "Computed values for all shorthands found in the style." },
                { "name": "cssText", "type": "string", "optional": true, "description": "Style declaration text (if available)." },
                { "name": "range", "$ref": "SourceRange", "optional": true, "description": "Style declaration range in the enclosing stylesheet (if available)." },
                { "name": "width", "type": "string", "optional": true, "description": "The effective \"width\" property value from this style." },
                { "name": "height", "type": "string", "optional": true, "description": "The effective \"height\" property value from this style." }
            ],
            "description": "CSS style representation."
        },
        {
            "id": "CSSProperty",
            "type": "object",
            "properties": [
                { "name": "name", "type": "string", "description": "The property name." },
                { "name": "value", "type": "string", "description": "The property value." },
                { "name": "priority", "type": "string", "optional": true, "description": "The property priority (implies \"\" if absent)." },
                { "name": "implicit", "type": "boolean", "optional": true, "description": "Whether the property is implicit (implies <code>false</code> if absent)." },
                { "name": "text", "type": "string", "optional": true, "description": "The full property text as specified in the style." },
                { "name": "parsedOk", "type": "boolean", "optional": true, "description": "Whether the property is understood by the browser (implies <code>true</code> if absent)." },
                { "name": "status", "type": "string", "enum": ["active", "inactive", "disabled", "style"], "optional": true, "description": "The property status: \"active\" if the property is effective in the style, \"inactive\" if the property is overridden by a same-named property in this style later on, \"disabled\" if the property is disabled by the user, \"style\" (implied if absent) if the property is reported by the browser rather than by the CSS source parser." },
                { "name": "range", "$ref": "SourceRange", "optional": true, "description": "The entire property range in the enclosing style declaration (if available)." }
            ],
            "description": "CSS style effective visual dimensions and source offsets."
        },
        {
            "id": "CSSMedia",
            "type": "object",
            "properties": [
                { "name": "text", "type": "string", "description": "Media query text." },
                { "name": "source", "type": "string", "enum": ["mediaRule", "importRule", "linkedSheet", "inlineSheet"], "description": "Source of the media query: \"mediaRule\" if specified by a @media rule, \"importRule\" if specified by an @import rule, \"linkedSheet\" if specified by a \"media\" attribute in a linked stylesheet's LINK tag, \"inlineSheet\" if specified by a \"media\" attribute in an inline stylesheet's STYLE tag." },
                { "name": "sourceURL", "type": "string", "optional": true, "description": "URL of the document containing the media query description." },
                { "name": "sourceLine", "type": "integer", "optional": true, "description": "Line in the document containing the media query (not defined for the \"stylesheet\" source)." }
            ],
            "description": "CSS media query descriptor."
        },
        {
            "id": "SelectorProfileEntry",
            "type": "object",
            "properties": [
                { "name": "selector", "type": "string", "description": "CSS selector of the corresponding rule." },
                { "name": "url", "type": "string", "description": "URL of the resource containing the corresponding rule." },
                { "name": "lineNumber", "type": "integer", "description": "Selector line number in the resource for the corresponding rule." },
                { "name": "time", "type": "number", "description": "Total time this rule handling contributed to the browser running time during profiling (in milliseconds.)" },
                { "name": "hitCount", "type": "integer", "description": "Number of times this rule was considered a candidate for matching against DOM elements." },
                { "name": "matchCount", "type": "integer", "description": "Number of times this rule actually matched a DOM element." }
            ],
            "description": "CSS selector profile entry."
        },
        {
            "id": "SelectorProfile",
            "type": "object",
            "properties": [
                { "name": "totalTime", "type": "number", "description": "Total processing time for all selectors in the profile (in milliseconds.)" },
                { "name": "data", "type": "array", "items": { "$ref": "SelectorProfileEntry" }, "description": "CSS selector profile entries." }
            ]
        },
        {
            "id": "Region",
            "type": "object",
            "properties": [
                { "name": "regionOverset", "type": "string", "enum": ["overset", "fit", "empty"], "description": "The \"overset\" attribute of a Named Flow." },
                { "name": "nodeId", "$ref": "DOM.NodeId", "description": "The corresponding DOM node id." }
            ],
            "description": "This object represents a region that flows from a Named Flow.",
            "hidden": true
        },
        {
            "id": "NamedFlow",
            "type": "object",
            "properties": [
                { "name": "documentNodeId", "$ref": "DOM.NodeId", "description": "The document node id." },
                { "name": "name", "type": "string", "description": "Named Flow identifier." },
                { "name": "overset", "type": "boolean", "description": "The \"overset\" attribute of a Named Flow." },
                { "name": "content", "type": "array", "items": { "$ref": "DOM.NodeId" }, "description": "An array of nodes that flow into the Named Flow." },
                { "name": "regions", "type": "array", "items": { "$ref": "Region" }, "description": "An array of regions associated with the Named Flow." }
            ],
            "description": "This object represents a Named Flow.",
            "hidden": true
        }
    ],
    "commands": [
        {
            "name": "enable",
            "description": "Enables the CSS agent for the given page. Clients should not assume that the CSS agent has been enabled until the result of this command is received."
        },
        {
            "name": "disable",
            "description": "Disables the CSS agent for the given page."
        },
        {
            "name": "getMatchedStylesForNode",
            "parameters": [
                { "name": "nodeId", "$ref": "DOM.NodeId" },
                { "name": "includePseudo", "type": "boolean", "optional": true, "description": "Whether to include pseudo styles (default: true)." },
                { "name": "includeInherited", "type": "boolean", "optional": true, "description": "Whether to include inherited styles (default: true)." }
            ],
            "returns": [
                { "name": "matchedCSSRules", "type": "array", "items": { "$ref": "RuleMatch" }, "optional": true, "description": "CSS rules matching this node, from all applicable stylesheets." },
                { "name": "pseudoElements", "type": "array", "items": { "$ref": "PseudoIdMatches" }, "optional": true, "description": "Pseudo style matches for this node." },
                { "name": "inherited", "type": "array", "items": { "$ref": "InheritedStyleEntry" }, "optional": true, "description": "A chain of inherited styles (from the immediate node parent up to the DOM tree root)." }
            ],
            "description": "Returns requested styles for a DOM node identified by <code>nodeId</code>."
        },
        {
            "name": "getInlineStylesForNode",
            "parameters": [
                { "name": "nodeId", "$ref": "DOM.NodeId" }
            ],
            "returns": [
                { "name": "inlineStyle", "$ref": "CSSStyle", "optional": true, "description": "Inline style for the specified DOM node." },
                { "name": "attributesStyle", "$ref": "CSSStyle", "optional": true, "description": "Attribute-defined element style (e.g. resulting from \"width=20 height=100%\")."}
            ],
            "description": "Returns the styles defined inline (explicitly in the \"style\" attribute and implicitly, using DOM attributes) for a DOM node identified by <code>nodeId</code>."
        },
        {
            "name": "getComputedStyleForNode",
            "parameters": [
                { "name": "nodeId", "$ref": "DOM.NodeId" }
            ],
            "returns": [
                { "name": "computedStyle", "type": "array", "items": { "$ref": "CSSComputedStyleProperty" }, "description": "Computed style for the specified DOM node." }
            ],
            "description": "Returns the computed style for a DOM node identified by <code>nodeId</code>."
        },
        {
            "name": "getAllStyleSheets",
            "returns": [
                { "name": "headers", "type": "array", "items": { "$ref": "CSSStyleSheetHeader" }, "description": "Descriptor entries for all available stylesheets." }
            ],
            "description": "Returns metainfo entries for all known stylesheets."
        },
        {
            "name": "getStyleSheet",
            "parameters": [
                { "name": "styleSheetId", "$ref": "StyleSheetId" }
            ],
            "returns": [
                { "name": "styleSheet", "$ref": "CSSStyleSheetBody", "description": "Stylesheet contents for the specified <code>styleSheetId</code>." }
            ],
            "description": "Returns stylesheet data for the specified <code>styleSheetId</code>."
        },
        {
            "name": "getStyleSheetText",
            "parameters": [
                { "name": "styleSheetId", "$ref": "StyleSheetId" }
            ],
            "returns": [
                { "name": "text", "type": "string", "description": "The stylesheet text." }
            ],
            "description": "Returns the current textual content and the URL for a stylesheet."
        },
        {
            "name": "setStyleSheetText",
            "parameters": [
                { "name": "styleSheetId", "$ref": "StyleSheetId" },
                { "name": "text", "type": "string" }
            ],
            "description": "Sets the new stylesheet text, thereby invalidating all existing <code>CSSStyleId</code>'s and <code>CSSRuleId</code>'s contained by this stylesheet."
        },
        {
            "name": "setPropertyText",
            "parameters": [
                { "name": "styleId", "$ref": "CSSStyleId" },
                { "name": "propertyIndex", "type": "integer" },
                { "name": "text", "type": "string" },
                { "name": "overwrite", "type": "boolean" }
            ],
            "returns": [
                { "name": "style", "$ref": "CSSStyle", "description": "The resulting style after the property text modification." }
            ],
            "description": "Sets the new <code>text</code> for a property in the respective style, at offset <code>propertyIndex</code>. If <code>overwrite</code> is <code>true</code>, a property at the given offset is overwritten, otherwise inserted. <code>text</code> entirely replaces the property <code>name: value</code>."
        },
        {
            "name": "toggleProperty",
            "parameters": [
                { "name": "styleId", "$ref": "CSSStyleId" },
                { "name": "propertyIndex", "type": "integer" },
                { "name": "disable", "type": "boolean" }
            ],
            "returns": [
                { "name": "style", "$ref": "CSSStyle", "description": "The resulting style after the property toggling." }
            ],
            "description": "Toggles the property in the respective style, at offset <code>propertyIndex</code>. The <code>disable</code> parameter denotes whether the property should be disabled (i.e. removed from the style declaration). If <code>disable == false</code>, the property gets put back into its original place in the style declaration."
        },
        {
            "name": "setRuleSelector",
            "parameters": [
                { "name": "ruleId", "$ref": "CSSRuleId" },
                { "name": "selector", "type": "string" }
            ],
            "returns": [
                { "name": "rule", "$ref": "CSSRule", "description": "The resulting rule after the selector modification." }
            ],
            "description": "Modifies the rule selector."
        },
        {
            "name": "addRule",
            "parameters": [
                { "name": "contextNodeId", "$ref": "DOM.NodeId" },
                { "name": "selector", "type": "string" }
            ],
            "returns": [
                { "name": "rule", "$ref": "CSSRule", "description": "The newly created rule." }
            ],
            "description": "Creates a new empty rule with the given <code>selector</code> in a special \"inspector\" stylesheet in the owner document of the context node."
        },
        {
            "name": "getSupportedCSSProperties",
            "returns": [
                { "name": "cssProperties", "type": "array", "items": { "$ref": "CSSPropertyInfo" }, "description": "Supported property metainfo." }
            ],
            "description": "Returns all supported CSS property names."
        },
        {
            "name": "forcePseudoState",
            "parameters": [
                { "name": "nodeId", "$ref": "DOM.NodeId", "description": "The element id for which to force the pseudo state." },
                { "name": "forcedPseudoClasses", "type": "array", "items": { "type": "string", "enum": ["active", "focus", "hover", "visited"] }, "description": "Element pseudo classes to force when computing the element's style." }
            ],
            "description": "Ensures that the given node will have specified pseudo-classes whenever its style is computed by the browser."
        },
        {
            "name": "startSelectorProfiler"
        },
        {
            "name": "stopSelectorProfiler",
            "returns": [
                { "name": "profile", "$ref": "SelectorProfile" }
            ]
        },
        {
            "name": "getNamedFlowCollection",
            "parameters": [
                { "name": "documentNodeId", "$ref": "DOM.NodeId", "description": "The document node id for which to get the Named Flow Collection." }
            ],
            "returns": [
                { "name": "namedFlows", "type": "array", "items": { "$ref": "NamedFlow" }, "description": "An array containing the Named Flows in the document." }
            ],
            "description": "Returns the Named Flows from the document.",
            "hidden": true
        }
    ],
    "events": [
        {
            "name": "mediaQueryResultChanged",
            "description": "Fires whenever a MediaQuery result changes (for example, after a browser window has been resized.) The current implementation considers only viewport-dependent media features."
        },
        {
            "name": "styleSheetChanged",
            "parameters": [
                { "name": "styleSheetId", "$ref": "StyleSheetId" }
            ],
            "description": "Fired whenever a stylesheet is changed as a result of the client operation."
        },
        {
            "name": "namedFlowCreated",
            "parameters": [
                { "name": "namedFlow", "$ref": "NamedFlow", "description": "The new Named Flow." }
            ],
            "description": "Fires when a Named Flow is created.",
            "hidden": true
        },
        {
            "name": "namedFlowRemoved",
            "parameters": [
                { "name": "documentNodeId", "$ref": "DOM.NodeId", "description": "The document node id." },
                { "name": "flowName", "type": "string", "description": "Identifier of the removed Named Flow." }
            ],
            "description": "Fires when a Named Flow is removed: has no associated content nodes and regions.",
            "hidden": true
        },
        {
            "name": "regionLayoutUpdated",
            "parameters": [
                { "name": "namedFlow", "$ref": "NamedFlow", "description": "The Named Flow whose layout may have changed." }
            ],
            "description": "Fires when a Named Flow's layout may have changed.",
            "hidden": true
        }
    ]
}

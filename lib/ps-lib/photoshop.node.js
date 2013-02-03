/*jshint asi:true evil:true laxbreak:true*/

var photoshop = exports

var PSLIB_SCRIPT
  = '#target photoshop\n'
  + '#include "'+ __dirname +'/vendor/json2.js"\n'
  + '#include "'+ __dirname +'/vendor/es5-sham.js"\n'
  + '#include "'+ __dirname +'/vendor/es5-shim.js"\n'
  + '#include "'+ __dirname +'/tojson.jsx"\n\n'

PSLIB_SCRIPT += ';(' + (function(){
  
  cTID = function(s) { return cTID[s] || cTID[s] = app.charIDToTypeID(s) }
  sTID = function(s) { return sTID[s] || sTID[s] = app.stringIDToTypeID(s) }
  
  function getNumberLayers() {
    var ref = new ActionReference
    ref.putProperty(cTID("Prpr"), cTID("NmbL"))
    ref.putEnumerated(cTID("Dcmn"), cTID("Ordn"), cTID("Trgt"))
    return executeActionGet(ref).getInteger(cTID("NmbL"))
  }
  function hasBackground(){try{activeDocument.backgroundLayer;return true}catch(e){return false}}
  
  /*global*/ getLayers = function(){
    var ref
    var layerCount = getNumberLayers() + Number(hasBackground())
    var index = layerCount
    var layers = Array(index)
  
    while (index-- > 0){
      ref = new ActionReference
      ref.putIndex(cTID("Lyr "), index)
      try {layers[index] = executeActionGet(ref)}
      catch(e){layers[index] = null}
    }
    return layers
  }
}).toString() + '())'

////////////////////////////////////////////////////////////////////////////////

var execFile = require('child_process').execFile
var TEMPLATE = function(){
  var transaction = $TRANSACTION
  var result
  function transactionWrapper(){ result = transaction() }
  if (!(app.documents.length)) transactionWrapper()
  else app.activeDocument.suspendHistory(decodeURIComponent("$NAME"), "transactionWrapper()")
  return result
}

photoshop.execute = function(name, script, callback){
  if (arguments.length === 2) {
    callback = script
    script = name
    name = 'AoPS'
  }
  if (typeof script != 'function') script = new Function(script);
  script = TEMPLATE.toString()
    .replace('$NAME', encodeURIComponent(name))
    .replace('$TRANSACTION', script.toString())
  photoshop.run('JSON.stringify(' + script.toString() + '(), null, 2);', function(err, out){
    if (err) return callback(err);
    try { out = JSON.parse(out) }catch(e){}
    callback(null, out)
  })
}

var runQueue = []
photoshop.run = function(script, callback){
  runQueue.push({script:script, callback:callback})
  if (!runReal.isRunning) runReal()
}
function runReal(){
  if (!runQueue.length) return;
  runReal.isRunning = true
  var args = runQueue.shift()
  var script = args.script, callback = args.callback
  
  if (typeof script == 'function') script = ';(' + script.toString() + '());';
  
  // console.log(PSLIB_SCRIPT + '\n' + script + '\n\n')
  
  execFile('/usr/bin/osascript',
    [
      '-e', 'on run argv',
      '-e',   'tell application "Adobe Photoshop CS6" to do javascript (item 1 of argv)',
      '-e', 'end run',
      PSLIB_SCRIPT + '\n\n' + script
    ],
    function(code, out, err){
      runReal.isRunning = false
      process.nextTick(runReal)
      out = out.replace(/\n$/,'')
      callback(code && err || code || null, out)
    }
  )
  
}

photoshop.open = function(path, callback){
  photoshop.run(';(' + openFileAtPath.toString() + '(' + JSON.stringify(path) + '));', callback)
}

photoshop.getLayers = function(callback){
  photoshop.run('JSON.stringify(getLayers());', function(err, out){
    if (err) return callback(err, out)
    try { out = JSON.parse(out) }catch(e){}
    callback(null, out)
  })
}
function ps_getDocument(){
    var doc = app.activeDocument
    var docObj = {
      layerId:-1,
      type:'document',
      name:doc.name,
      path:decodeURIComponent(doc.fullName.path),
      bounds:{
        left:0,
        top:0,
        width: app.activeDocument.width.as('px'),
        height: app.activeDocument.height.as('px'),
      },
      children: getLayers(),
    }
    docObj.bounds.right = docObj.bounds.width
    docObj.bounds.bottom = docObj.bounds.height
    return docObj
  }

photoshop.getDocument = function(callback){
  photoshop.run('JSON.stringify(' + ps_getDocument + '());', function(err, out){
    if (err) return callback(err, out)
    try { out = JSON.parse(out) }catch(e){}
    callback(null, out)
  })
}


function openFileAtPath(path){
  path = new File(path)
  if (!path.exists) throw Error("doesn't exist: '" + path + "'");
  
  var idOpn = charIDToTypeID("Opn ")
  var idnull = charIDToTypeID("null")
  var desc = new ActionDescriptor()
  desc.putPath(idnull, path)
  return executeAction(idOpn, desc, DialogModes.NO)
}

if (module.id == '.') {
  photoshop.run('1+1', function(err, out){
    console.log('Test', err, out)
    console.assert(out === '2')
  })
  photoshop.execute('return 1+1', function(err, out){
    console.log('Test', err, out)
    console.assert(out === 2)
  })
  photoshop.getDocument(function(error, document){
    if (error) return callback(error)
    console.log(document)
  })
}

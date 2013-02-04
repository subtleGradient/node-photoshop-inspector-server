/*jshint asi:true evil:true laxbreak:true*/

var photoshop = exports

var PSLIB_SCRIPT
  = '#target photoshop\n'
  + '#include "'+ __dirname +'/vendor/json2.js"\n'
  + '#include "'+ __dirname +'/vendor/es5-sham.js"\n'
  + '#include "'+ __dirname +'/vendor/es5-shim.js"\n'
  + '#include "'+ __dirname +'/tojson.jsx"\n'
  + '#include "'+ __dirname +'/PSFakeDOM2.jsx"\n\n'
  + '\n'

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
  
  photoshop.debug && console.warn(PSLIB_SCRIPT + '\n' + script + '\n\n')
  
  // FIXME: Buffer overflow
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

photoshop.invoke = function(fn, args, callback){
  if (arguments.length == 2){
    callback = args
    args = []
  }
  photoshop.run(';JSON.stringify(' + fn + '(' + JSON.stringify(args).replace(/^\[|\]$/g,'') + '));', function(err, out, error){
    if (err) return callback(err, error || out)
    try { out = JSON.parse(out) }catch(e){}
    callback(null, out)
  })
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
  photoshop.invoke('PSFakeDOM.getDocumentNode', function(error, document){
    if (error) return callback(error)
    console.log(document)
  })
}

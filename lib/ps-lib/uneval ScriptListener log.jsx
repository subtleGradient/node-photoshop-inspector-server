#target "photoshop"

#include "./vendor/json2.js"
#include "./vendor/es5-sham.js"
#include "./vendor/es5-shim.js"
#include "./console.jsx"
#include "./tojson.jsx"
#include "./PSFakeDOM2.jsx"
#include "./ao-psaction.jsx"


var log = new File('~/Desktop/ScriptingListenerJS.log');
log.open('r');

var file = new File('~/Desktop/ScriptingListenerJS.uneval.jsx');
file.open('w');

;(function(executeAction){
  while(!log.eof) try{eval(log.readln())}catch(e){$.writeln(e)}
}(function executeAction(a, b, c) {
  file.writeln('executeAction(stringIDToTypeID("', typeIDToStringID(a), '"), ', uneval(b), ', ', c + '', ');\n\n\n')
}))

file.writeln()
log.close()
file.close()

file

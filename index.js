#!/usr/bin/env node
/*jshint asi:true*/

exports.Agent = require('./lib/webkit-devtools-agent')

if (module.id == '.') require('./server')

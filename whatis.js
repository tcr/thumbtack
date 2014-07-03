#!/usr/bin/env node

var colors = require('colors');
var split = require('split')
var spawn = require('child_process').spawn;

var hex = parseInt(process.argv[2], 16);

var proc = spawn('arm-none-eabi-objdump', ['-S', '--disassembler-options=force-thumb', '-D', 'main']);

var trail = [];
var matched = false;
proc.stdout
  .pipe(split())
  .on('data', function (line) {
    //console.log(line);
    var m;
    if (!matched && (m = line.match(/^\s+([0-9a-f]+):/i))) {
      var hex2 = parseInt(m[1], 16);
      if (hex2 >= hex) {
        matched = true;
        trail.push(line.green);
        return;
      }
    }

    // Empty line separator
    if (line.match(/^\s*$/)) {
      if (matched) {
        trail.forEach(function (line) {
          console.log(line);
        })
        process.exit(0);
      } else {
        trail = [];
        return;
      }
    }

    trail.push(line);
  })


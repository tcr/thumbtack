#!/usr/bin/env node

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var split = require('split');
var minimist = require('minimist');
var fs = require('fs');

var opts = minimist(process.argv.slice(2));

if (opts._[0].match(/^disas(semble)?$/)) {
  var bufs = [];
  opts._.slice(1).forEach(function (arg) {
    var hword = new Buffer(2);
    var ins = parseInt(arg, 16);
    hword.writeUInt16BE(ins, 0);
    bufs.push(hword);
  })
  fs.writeFileSync('/tmp/thumbtack.out', Buffer.concat(bufs));

  var proc = spawn('arm-none-eabi-objdump', ['-b', 'binary', '-marm', '-D', '--disassembler-options=force-thumb', '--endian=big', '/tmp/thumbtack.out']);
  var ready = false;
  proc.stdout
    .pipe(split())
    .on('data', function (line) {
      if (ready && !line.match(/^\s*$/)) {
        console.log(line.replace(/[\s\n]+$/, ''));
      }
      if (line.match(/^0+/)) {
        ready = true;
      }
    })
}

else if (opts._[0].match(/^comp(ile)?$/)) {
  var bufs = [];
  var asm = (opts._[1].replace(/\\n/g, '\r\n') + '\r\n').replace(/^([^:\n]+\b)/mg, '  $1');

  fs.writeFileSync('/tmp/thumbtack.s', '.thumb\n.syntax unified\n.section .text\nasm_main:\n' + asm);

  exec('arm-none-eabi-as -mcpu=cortex-m3 -c /tmp/thumbtack.s -o /tmp/thumbtack.out', function (err, _, stderr) {
    if (err) {
      console.error('Compilation failed with error', err + ':');
      console.error(stderr);
      process.exit(1);
    }

    var proc = spawn('arm-none-eabi-objdump', ['-marm', '-D', '--disassembler-options=force-thumb', '/tmp/thumbtack.out']);
    var ready = false;
    proc.stdout
      .pipe(split())
      .on('data', function (line) {
        if (ready && !line.match(/^\s*$/)) {
          console.log(line.replace(/[\s\n]+$/, ''));
        }
        if (ready && line.match(/^\s*$/)) {
          process.exit(1);
        }
        if (line.match(/^0+/)) {
          ready = true;
        }
      })
  })
}

else {
  console.error('Usage: thumbtack (disas|compile)')
  process.exit(1);
}

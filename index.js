#!/usr/bin/env node

var colors = require('colors');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var split = require('split');
var minimist = require('minimist');
var fs = require('fs');

var opts = minimist(process.argv.slice(2), {
  string: ['_']
});

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

  fs.writeFileSync('/tmp/thumbtack.s', '.thumb\n.syntax unified\n.section .text\n.global main\nmain:\n' + asm + '\n\n.global _exit\n_exit:\n\tnop\n');

  exec('arm-none-eabi-as -mcpu=cortex-m3 /tmp/thumbtack.s -o /tmp/thumbtack.s.out', function (err, _, stderr) {
    if (err) {
      console.error('Compilation failed with error', err + ':');
      console.error(stderr);
      process.exit(1);
    }

    exec('arm-none-eabi-gcc /tmp/thumbtack.s.out -o /tmp/thumbtack.out', function (err, _, stderr) {
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
          if (line.match(/^[0-9a-z]+ <main>:/i)) {
            ready = true;
          }
        })
    });
  })
}

else if (opts._[0] == 'label') {
  var file = opts._[1];
  var label = opts._[2];

  var proc = spawn('arm-none-eabi-objdump', ['--disassembler-options=force-thumb', '-M', 'reg-names-std', '-D', file]);
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
      if (line.match(new RegExp("^[0-9a-z]+ <" + label + ">:", "i"))) {
        console.log(line.green);
        ready = true;
      }
    })
}

else if (opts._[0] == 'list') {
  var file = opts._[1];

  var proc = spawn('arm-none-eabi-objdump', ['-S', '--disassembler-options=force-thumb', '-D', file]);
  proc.stdout.pipe(process.stdout);
}

else if (opts._[0] == 'addr') {
  var file = opts._[1];
  var hex = parseInt(opts._[2], 16);

  var proc = spawn('arm-none-eabi-objdump', ['-S', '--disassembler-options=force-thumb', '-D', file]);

  var trail = [];
  var matched = false;
  proc.stdout
    .pipe(split())
    .on('data', function (line) {
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
}

else if (opts._[0] == 'hex') {
  console.log(parseInt(opts._[1], 2).toString(16))
}

else if (opts._[0] == 'bin') {
  console.log(parseInt(opts._[1], 16).toString(2))
}

else {
  console.error('Usage: thumbtack (disas|compile)')
  process.exit(1);
}

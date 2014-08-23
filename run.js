#!/usr/bin/env node

var net = require('net');
var spawn = require('child_process').spawn

function collect (fn) {
  var stream = new (require('stream').Writable)
  var bufs = [];
  stream._write = function (data, enc, cb) { bufs.push(data); cb() }
  stream.on('pipe', function (s) { s.on('end', function () { fn(Buffer.concat(bufs)); }) })
  return stream;
}

function run (file)
{
  var ret;

  var server = net.createServer(function (c) {
    c.once('data', function () {
      setImmediate(function () {
        ret && spawn('kill', ['-9', ret.pid]).on('exit', function (c) {
          process.exit(0);
        })
      });
    });
  })
  server.listen(0, function () {
    launchqemu(server.address().port);
  })

  function launchqemu (port)
  {
    process.env.STELLARIS_FLASH = 1024
    process.env.STELLARIS_SRAM = 8196
    ret = spawn('qemu-system-arm', [
      '-m', '1024K', '-M', 'lm3s6965evb', '--kernel', file,
      '-no-reboot', '-nographic', '-monitor', 'null',
      '-serial', 'stdio', '-serial', 'telnet::' + port
    ].concat(
      (process.argv.indexOf('-d') > -1 ? ['-s', '-S'] : []),
      (process.argv.indexOf('-v') > -1 ? ['-d', 'cpu,exec,in_asm'] : [])
    ));

    ret.on('error', function (err) {
        console.error(err);
        process.exit(1);
    });
    // ret.stderr.pipe(process.stderr);
    ret.stdout.pipe(process.stdout);

    // ret.stdout.on('data', function (d) {
    //  d = String(d);
    //  if (d.indexOf('# terminate.') > -1) {
    //    spawn('kill', ['-9', ret.pid]).on('exit', function (c) {
    //      process.exit(0);
    //    })
    //  }
    // })

    // if (process.argv[3] != '-d') {
    //   ret.stdout.once('data', function () {
    //     setTimeout(function () {
    //       spawn('kill', ['-9', ret.pid])
    //     }, process.argv[3] ? Number(process.argv[3]) : 1000000);
    //   })
    // }
  }
}

exports.run = run;

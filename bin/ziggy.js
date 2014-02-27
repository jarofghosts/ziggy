#!/usr/bin/env node

var Ziggy = require('../').Ziggy,
    nopt = require('nopt'),
    fs = require('fs'),
    path = require('path'),
    noptions = {
      plugins: Array,
      port: Number,
      server: String,
      secure: Boolean,
      channels: Array,
      nickname: String,
      password: String,
      user: Array,
      help: Boolean,
      version: Boolean
    },
    shorthands = {
      p: ['--plugin'],
      P: ['--port'],
      s: ['--server'],
      S: ['--secure'],
      c: ['--channels'],
      channel: ['--channels'],
      plugin: ['--plugins'],
      pass: ['--password'],
      nick: ['--nickname'],
      n: ['--nickname'],
      u: ['--user'],
      h: ['--help'],
      v: ['--version']
    },
    options = nopt(noptions, shorthands, process.argv)

if (options.help) return help()
if (options.version) return version()
options.users = {}
if (options.user) {
  for (var i = 0, l = options.user.length; i < l; ++i) {
    var pair = options.user[i],
        pieces = pair.split(':')

    options.users[pieces[0]] = { userLevel: 3, password: pieces[1] }
  }
  delete options.user
}

options.plugins = (options.plugins || []).map(function resolve_plugins(file) {
  return require(path.resolve(file))
})

new Ziggy(options).start()

function help() {
  version()
  fs.createReadStream(path.resolve(__dirname, '..', 'help.txt'))
      .pipe(process.stdout)
}

function version() {
  var ziggy_version = require('../package.json').version
  process.stdout.write('ziggy version ' + ziggy_version + '\n')
}

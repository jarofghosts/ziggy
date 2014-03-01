#!/usr/bin/env node

var Ziggy = require('../').Ziggy
  , nopt = require('nopt')
  , path = require('path')
  , fs = require('fs')

var noptions = {
    plugins: Array
  , port: Number
  , server: String
  , secure: Boolean
  , channels: Array
  , nickname: String
  , password: String
  , user: Array
  , help: Boolean
  , version: Boolean
}

var shorthands = {
    p: ['--plugin']
  , P: ['--port']
  , s: ['--server']
  , S: ['--secure']
  , c: ['--channels']
  , channel: ['--channels']
  , plugin: ['--plugins']
  , pass: ['--password']
  , nick: ['--nickname']
  , n: ['--nickname']
  , u: ['--user']
  , h: ['--help']
  , v: ['--version']
}

var options = nopt(noptions, shorthands, process.argv)

if (options.help) return help()
if (options.version) return version()

options.users = {}

if (options.user) {
  var password
    , pieces
    , nick
    , pair

  for (var i = 0, l = options.user.length; i < l; ++i) {
    pair = options.user[i]
    pieces = pair.split(':')
    nick = pieces[0]
    password = pieces[1]

    options.users[nick] = {
        userLevel: 3
      , password: password
    }
  }

  delete options.user
}

options.plugins = (options.plugins || []).map(resolve_plugin)

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

function resolve_plugin(file) {
  var plugin = try_require(file) ||
      try_require(path.resolve(process.cwd(), file)) ||
      noop

  return plugin
}

function try_require(module) {
  try {
    return require(module)
  } catch(e) {
    return null
  }
}

function noop() {}

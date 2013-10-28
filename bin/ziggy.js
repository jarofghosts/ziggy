#!/usr/bin/env node

var Ziggy = require('../').Ziggy,
    nopt = require('nopt'),
    noptions = {
      plugins: Array,
      port: Number,
      server: String,
      secure: Boolean,
      channels: Array,
      nickname: String,
      password: String,
      user: Array
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
      u: ['--user']
    },
    options = nopt(noptions, shorthands, process.argv)

options.users = {}
if (options.user) {
  for (var i = 0, l = options.user.length; i < l; ++i) {
    var pair = options.user[i],
        pieces = pair.split(':')

    options.users[pieces[0]] = pieces[1]
  }
  delete options.user
}
options.plugins = options.plugins.map(function (file) {
  return require(file)
})

new Ziggy(options).start()

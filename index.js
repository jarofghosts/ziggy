var EE = require('events').EventEmitter

var extend = require('xtend')
  , irc = require('irc')

var attach_listeners = require('./lib/attach-listeners')
  , populate_users = require('./lib/populate-users')

module.exports = createZiggy

function Ziggy(settings) {
  EE.call(this)

  this.setMaxListeners(0)

  this.settings = {}

  this.settings.server = settings.server || 'irc.freenode.net'
  this.settings.port = settings.port || 6667
  this.settings.channels = settings.channels || []
  this.settings.nickname = settings.nickname || 'Ziggy'
  this.settings.username = settings.username || 'ziggy'
  this.settings.realName = settings.realName || 'Ziggy'
  this.settings.plugins = settings.plugins || []
  this.settings.password = settings.password
  this.settings.secure = !!settings.secure
  this.settings.client = settings.client

  this.settings.users = populate_users(settings.users)

  return this
}

Ziggy.prototype = Object.create(EE.prototype)

Ziggy.prototype.activatePlugins = function Ziggy$activatePlugins() {
  var plugin

  for(var i = 0, l = this.settings.plugins.length; i < l; ++i) {
    plugin = this.settings.plugins[i]

    plugin.setup(this, plugin.settings)
  }
}

Ziggy.prototype.deactivatePlugins = function Ziggy$deactivatePlugins() {
  this.removeAllListeners()
  require.cache = {}
}

Ziggy.prototype.start = function Ziggy$start() {
  this.activatePlugins()

  var options = {
      channels: this.settings.channels
    , userName: this.settings.username
    , realName: this.settings.realName
    , password: this.settings.password
    , thisSigned: true
    , certExpired: true
    , port: this.settings.port
    , secure: this.settings.secure
  }

  this.client = this.settings.client || new irc.Client(
      this.settings.server
    , this.settings.nickname
    , options
  )

  attach_listeners(this)
}

Ziggy.prototype.say = function Ziggy$say(target, text) {
  return this.client.say(target, text)
}

Ziggy.prototype.action = function Ziggy$action(channel, message) {
  return this.client.action(channel, message)
}

Ziggy.prototype.notice = function Ziggy$notice(target, message) {
  return this.client.notice(target, message)
}

Ziggy.prototype.invite = function Ziggy$invite(nickname, channel) {
  this.client.send('INVITE', nickname, channel)
}

Ziggy.prototype.topic = function Ziggy$topic(channel, topic) {
  this.client.send('TOPIC', channel, topic)
}

Ziggy.prototype.part = function Ziggy$part(channels, callback) {
  var self = this

  callback = callback || noop

  if(Array.isArray(channels)) {
    channels.forEach(function(channel) {
      self.part(channel)
    })

    return callback()
  }

  self.client.part(channels, function () {
    if(self.settings.channels[channels]) {
      delete self.settings.channels[channels]
    }

    callback()
  })
}

Ziggy.prototype.join = function Ziggy$join(channels, callback) {
  var self = this

  callback = callback || noop

  if(Array.isArray(channels)) {
    channels.forEach(function(channel) {
      self.join(channel)
    })

    return callback()
  }

  self.client.join(channels, function () {
    if(!self.settings.channels[channels]) {
      self.settings.channels[channels] = {}
      callback()
    }
  })
}

Ziggy.prototype.whois = function Ziggy$whois(nick, callback) {
  var self = this

  self.client.whois(nick, function (info) {
    if(!self.settings.users[nick]) self.settings.users[nick] = { shared: {} }
    self.settings.users[nick].shared.whois = info

    if(callback) callback(self.user(nick))
  })
}

Ziggy.prototype.colorize = function Ziggy$colorize(text, color) {
  return irc.colors.wrap(color, text)
}

Ziggy.prototype.disconnect = function Ziggy$disconnect(message, callback) {
  this.client.disconnect(message, callback)
}

Ziggy.prototype.channels = function Ziggy$channels() {
  return this.settings.channels
}

Ziggy.prototype.channel = function Ziggy$channel(channel) {
  return this.settings.channels[channel]
}

Ziggy.prototype.users = function Ziggy$users(callback) {
  var users = Object.keys(this.settings.users)
    , user_list = {}
    , user

  for(var i = 0, l = users.length; i < l; ++i) {
    user = users[i]

    user_list[user] = this.settings.users[user].shared
  }

  return user_list
}

Ziggy.prototype.user = function Ziggy$user(nickname) {
  var default_user_info = {userLevel: 0, authenticated: false}
    , user_info = this.settings.users[nickname] ?
      this.settings.users[nickname].shared : default_user_info

  return {
      nick: nickname
    , info: user_info
  }
}

Ziggy.prototype.nick = function Ziggy$nick(nickname) {
  this.client.send('NICK', nickname)
}

Ziggy.prototype.level = function Ziggy$level(channel) {
  return this.settings.channels[channel].users[this.settings.nickname].level
}

Ziggy.prototype.mode = function Ziggy$mode(channel, mode, nick) {
  if(nick) return this.client.send('MODE', channel, mode, nick)

  this.client.send('MODE', channel, mode)
}

Ziggy.prototype.op = function Ziggy$op(channel, nick) {
  this.mode(channel, '+o', nick)
}

Ziggy.prototype.deop = function Ziggy$deop(channel, nick) {
  this.mode(channel, '-o', nick)
}

Ziggy.prototype.register = function Ziggy$register(users) {
  this.settings.users =  extend(
      this.settings.users
    , populate_users(this, users)
  )
}

Ziggy.prototype.update = function Ziggy$update(user_objects) {
  var users = Object.keys(user_objects)
    , user

  for(i = 0, l = users.length; i < l; ++i) {
    user = users[i]

    if(!this.settings.users[user]) {
      this.settings.users[user] = user_objects[user]
    }

    this.settings.users[user] = extend(
        this.settings.users[user]
      , user_objects[user]
    )
  }
}

Ziggy.prototype.unregister = function Ziggy$unregister(users) {
  if(!Array.isArray(users)) users = [users]

  for(var i = 0, l = users.length; i < l; ++i) {
    delete this.settings.users[users[i]]
  }
}

function createZiggy(options) {
  return new Ziggy(options)
}

function noop() {}

var util = require('util'),
    EE = require('events').EventEmitter,
    irc = require('irc'),
    extend = require('xtend'),
    noop = function () {}

module.exports.Ziggy = Ziggy

function Ziggy(settings) {
  if (!(this instanceof Ziggy)) return new Ziggy(settings)

  this.settings = {}

  this.settings.server = settings.server || 'irc.freenode.net'
  this.settings.port = settings.port || 6667
  this.settings.channels = settings.channels || []
  this.settings.nickname = settings.nickname || 'Ziggy'
  this.settings.plugins = settings.plugins || []
  this.settings.password = settings.password
  this.settings.users = {}
  this.settings.secure = !!settings.secure

  var i
    , l

  for (i = 0, l = this.settings.plugins.length; i < l; ++i) {
    this.settings.plugins[i](this)
  }

  var users = Object.keys(settings.users)

  for (i = 0, l = users.length; i < l; ++i) {
    var user = users[i]

    this.settings.users[user] = users[user]
    this.settings.users[user].shared = {
      userLevel: this.settings.users[user].userLevel,
      authenticated: this.settings.users[user].password === undefined,
      whois: null
    }
  }

  return this
}

util.inherits(Ziggy, EE)

Ziggy.prototype.start = function Ziggy$start() {
  var self = this
    , options

  options = {
      channels: self.settings.channels
    , userName: 'ziggy'
    , realName: 'Ziggy'
    , password: self.settings.password
    , selfSigned: true
    , certExpired: true
    , port: self.settings.port
    , secure: self.settings.secure
  }

  self.client = new irc.Client(
      self.settings.server
    , self.settings.nickname
    , options
  )

  self.client.on('registered', self.emit.bind(self, 'ready'))

  self.client.on('message#', function (nick, to, text, message) {
    var user = self.lookupUser(nick)

    self.emit('message', user, to, text)
  })

  self.client.on('pm', function (nick, text, message) {
    var user = self.lookupUser(nick)

    if (self.settings.users[nick] &&
      !self.settings.users[nick].shared.authenticated) {

      var bits = text.split(' ')
        , command = bits[0]
        , args = bits[1]

      if (command === 'auth' && self.settings.users[nick].password === args) {
        self.settings.users[nick].shared.authenticated = true

        self.emit('authed', self.lookupUser(nick))
      }
    }

    self.emit('pm', user, text)
  })

  self.client.on('nick', function (oldnick, newnick, channels) {
    var channel

    if (oldnick === self.settings.nickname) self.settings.nickname = newnick

    if (self.settings.users[oldnick]) {
      self.settings.users[newnick] =
          Object.create(self.settings.users[oldnick])

      delete self.settings.users[oldnick]
    }

    for (var i = 0, l = channels.length; i < l; ++i) {
      channel = channels[i]

      self.settings.channels[channel].users[newnick] = Object.create(
          self.settings.channels[channel].users[oldnick]
      )

      delete self.settings.channels[channels[i]].users[oldnick]
    }

    self.emit('nick', oldnick, self.lookupUser(newnick), channels)
  })

  self.client.on('+mode', function (channel, by, mode, argument) { 
    var set_by = self.lookupUser(by)
      , current_level
      , user_mode

    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, set_by, '+' + mode, argument)
    }

    current_level = self.settings.channels[channel].users[argument].level

    if (current_level === '@') return

    self.emit(
        mode === 'o' ? 'op' : 'voice'
      , channel
      , set_by
      , self.lookupUser(argument)
    )

    user_mode = mode === 'o' ? '@' : '+'
    
    self.settings.channels[channel].users[argument].level = user_mode
  })

  self.client.on('-mode', function (channel, by, mode, argument) { 
    var set_by = self.lookupUser(by)
      , current_level

    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, set_by, '-' + mode, argument)
    }

    current_level = self.settings.channels[channel].users[argument].level

    if (current_level.length) {
      var user_mode = ''

      if (mode === 'o') {
        self.emit('deop', channel, set_by, self.lookupUser(argument))
      } else {
        user_mode = current_level == '@' ? '@' : ''
        self.emit('devoice', channel, set_by, self.lookupUser(argument))
      }

      self.settings.channels[channel].users[argument].level = user_mode
    }
  })

  self.client.on('topic', function (channel, topic, nick, message) {
    if (!self.settings.channels[channel]) self.settings.channels[channel] = {}

    self.settings.channels[channel].topic = {
        text: topic
      , setBy: self.lookupUser(nick)
    }

    self.emit('topic', channel, topic, nick, message)
  })

  self.client.on('names', function (channel, nicks) {
    var nicknames = Object.keys(nicks)
      , nickname

    if (!self.settings.channels[channel]) self.settings.channels[channel] = {}
    if (!self.settings.channels[channel].users) {
      self.settings.channels[channel].users = {}
    }

    for (var i = 0, l = nicknames.length; i < l; ++i) {
      nickname = nicknames[i]

      self.settings.channels[channel].users[nickname] = self.lookupUser(
          nickname
      )

      self.settings.channels[channel].users[nickname].level = nicks[nickname]
    }
  })

  self.client.on('part', function (channel, nick, reason, message) {
    if (nick === self.settings.nickname) {
      return self.emit('ziggypart', channel)
    }

    user = self.lookupUser(nick)

    delete self.settings.channels[channel].users[nick]

    self.emit('part', user, channel, reason)
  })

  self.client.on('quit', function (nick, reason, channels, message) {
    var user = self.lookupUser(nick)
      , channel

    for (var i = 0, l = channels.length; i < l; ++i) {
      channel = channels[i]

      if (self.settings.channels[channel] &&
          self.settings.channels[channel][nick]) {

        delete self.settings.channels[channel][nick]
      }
    }

    self.emit('quit', user, reason)
  })

  self.client.on('kick', function (channel, nick, by, reason) {
    var kicked = self.lookupUser(nick)
      , kicker = self.lookupUser(by)

    if (self.settings.channels[channel][nick]) {
      delete self.settings.channels[channel][nick]
    }

    self.emit('kick', kicked, kicker, channel, reason)
  })

  self.client.on('invite', function (channel, from, message) {
    var user = self.lookupUser(from)

    self.emit('invite', channel, user)
  })

  self.client.on('join', function (channel, nick, message) {
    if (nick === self.settings.nickname) {
      return self.emit('ziggyjoin', channel, message)
    }

    user = self.lookupUser(nick)

    self.settings.channels[channel].users[nick] = user

    self.emit('join', channel, user, message)
  })

  self.client.addListener('error', function (message) {
    console.log('error: ', message)
  })
}

Ziggy.prototype.say = function Ziggy$say(target, text) {
  return this.client.say(target, text)
}

Ziggy.prototype.action = function Ziggy$action(channel, message) {
  return this.client.action(channel, message)
}

Ziggy.prototype.topic = function Ziggy$topic(channel, topic) {
  this.client.send('TOPIC', channel, topic)
}

Ziggy.prototype.part = function Ziggy$part(channels, callback) {
  var self = this

  callback = callback || noop

  if (Array.isArray(channels)) {
    channels.forEach(function(channel) {
      self.part(channel)
    })

    return callback()
  }

  self.client.part(channels, function () {
    if (self.settings.channels[channels]) {
      delete self.settings.channels[channels]
    }

    callback()
  })
}

Ziggy.prototype.join = function Ziggy$join(channels, callback) {
  var self = this

  callback = callback || noop

  if (Array.isArray(channels)) {
    channels.forEach(function(channel) {
      self.join(channel)
    })

    return callback()
  }

  self.client.join(channels, function () {
    if (!self.settings.channels[channels]) {
      self.settings.channels[channels] = {}
      callback()
    }
  })
}

Ziggy.prototype.whois = function Ziggy$whois(nick, callback) {
  var self = this

  self.client.whois(nick, function (info) {
    if (!self.settings.users[nick]) self.settings.users[nick] = { shared: {} }
    self.settings.users[nick].shared.whois = info

    if (callback) callback(self.lookupUser(nick))
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
  return this.userList()
}

Ziggy.prototype.user = function Ziggy$user(nickname) {
  return this.lookupUser(nickname)
}

Ziggy.prototype.nick = function Ziggy$nick(nickname) {
  this.client.send('NICK', nickname)
}

Ziggy.prototype.level = function Ziggy$level(channel) {
  return this.settings.channels[channel].users[this.settings.nickname].level
}

Ziggy.prototype.mode = function Ziggy$mode(channel, mode, nick) {
  if (nick) {
    return this.client.send('MODE', channel, mode, nick)
  }

  this.client.send('MODE', channel, mode)
}

Ziggy.prototype.op = function Ziggy$op(channel, nick) {
  this.mode(channel, '+o', nick)
}

Ziggy.prototype.deop = function Ziggy$deop(channel, nick) {
  this.mode(channel, '-o', nick)
}

Ziggy.prototype.register = function Ziggy$register(users) {
  populateUsers(this, users)
}

Ziggy.prototype.update = function Ziggy$update(userObjects) {
  var users = Object.keys(userObjects)
    , user

  for (i = 0, l = users.length; i < l; ++i) {
    user = users[i]

    if (!this.settings.users[user]) {
      this.settings.users[user] = userObjects[user]
    }

    this.settings.users[user] = extend(
        this.settings.users[user]
      , userObjects[user]
    )
  }
}

Ziggy.prototype.unregister = function Ziggy$unregister(users) {
  if (!Array.isArray(users)) users = [users]

  for (var i = 0, l = users.length; i < l; ++i) {
    delete this.settings.users[users[i]]
  }
}

Ziggy.prototype.userList = function Ziggy$userList() {
  var users = Object.keys(this.settings.users)
    , user_list = {}
    , user

  for (var i = 0, l = users.length; i < l; ++i) {
    user = users[i]

    user_list[user] = this.settings.users[user].shared
  }

  return user_list
}

Ziggy.prototype.lookupUser = function Ziggy$lookupUser(nickname) {
  var user_info = this.settings.users[nickname] ?
      this.settings.users[nickname].shared : null

  return {
      nick: nickname
    , info: user_info
  }
}

module.exports.createZiggy = function createZiggy(options) {
  return new Ziggy(options)
}

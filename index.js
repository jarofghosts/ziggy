var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc'),
    extend = require('xtend'),
    libz = require('./lib/libziggy.js'),
    populateUsers = libz.populateUsers,
    activatePlugins = libz.activatePlugins,
    lookupUser = libz.lookupUser,
    massExecute = libz.massExecute,
    userList = libz.userList,
    noop = function () {}

function Ziggy(settings) {
  if (!(this instanceof Ziggy)) return new Ziggy(settings)

  this.settings = {}

  this.settings.server = settings.server || 'irc.freenode.net'
  this.settings.port = settings.port || 6667
  this.settings.channels = settings.channels || []
  this.settings.nickname = settings.nickname || 'Ziggy'
  this.settings.plugins = settings.plugins || []
  this.settings.password = settings.password
  this.settings.secure = !!settings.secure

  populateUsers(this, (settings.users || {}))
  activatePlugins(this)

  return this
}

util.inherits(Ziggy, EventEmitter)

Ziggy.prototype.start = function Ziggy$start() {
  var self = this

  self.client = new irc.Client(self.settings.server, self.settings.nickname,
                               { channels: self.settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 password: self.settings.password,
                                 selfSigned: true,
                                 certExpired: true,
                                 port: self.settings.port,
                                 secure: self.settings.secure })

  self.client.on('registered', self.emit.bind(self, 'ready'))

  self.client.on('message#', function (nick, to, text, message) {
    var user = lookupUser(self, nick)
    self.emit('message', user, to, text)
  })

  self.client.on('pm', function (nick, text, message) {
    var user = lookupUser(self, nick)
    if (self.settings.users[nick] &&
      !self.settings.users[nick].shared.authenticated) {
      var bits = text.split(' '),
          command = bits[0],
          args = bits[1]
      if (command === 'auth' && self.settings.users[nick].password === args) {
        self.settings.users[nick].shared.authenticated = true
        self.emit('authed', lookupUser(self, nick))
      }
    }

    self.emit('pm', user, text);
  })

  self.client.on('nick', function (oldnick, newnick, channels) {
    if (oldnick === self.settings.nickname) self.settings.nickname = newnick
    if (self.settings.users[oldnick]) {
      self.settings.users[newnick] = Object.create(self.settings.users[oldnick])
      delete self.settings.users[oldnick]
    }
    var i = 0,
        l = channels.length

    for (; i < l; ++i) {
      self.settings.channels[channels[i]].users[newnick] = Object.create(self.settings.channels[channels[i]].users[oldnick])
      delete self.settings.channels[channels[i]].users[oldnick]
    }

    self.emit('nick', oldnick, lookupUser(self, newnick), channels)
  })

  self.client.on('+mode', function (channel, by, mode, argument) { 
    var setBy = lookupUser(self, by)
    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, setBy, '+' + mode, argument)
    }

    var currentLevel = self.settings.channels[channel].users[argument].level
    if (currentLevel !== '@') {
      var userMode = ''

      if (mode == 'o') {
        self.emit('op', channel, setBy, lookupUser(self, argument))
        userMode = '@'
      } else {
        self.emit('voice', channel, setBy, lookupUser(self, argument))
        userMode = '+'
      }
      
      self.settings.channels[channel].users[argument].level = userMode
    }
  })

  self.client.on('-mode', function (channel, by, mode, argument) { 
    var setBy = lookupUser(self, by)
    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, setBy, '-' + mode, argument)
    }

    var currentLevel = self.settings.channels[channel].users[argument].level
    if (currentLevel !== '') {
      var userMode = ''
      if (mode == 'o') {
        self.emit('deop', channel, setBy, lookupUser(self, argument))
      } else {
        userMode = currentLevel == '@' ? '@' : ''
        self.emit('devoice', channel, setBy, lookupUser(self, argument))
      }

      self.settings.channels[channel].users[argument].level = userMode
    }
  })

  self.client.on('topic', function (channel, topic, nick, message) {
    if (!self.settings.channels[channel]) self.settings.channels[channel] = {}
    self.settings.channels[channel].topic = {
      text: topic,
      setBy: lookupUser(self, nick)
    }

    self.emit('topic', channel, topic, nick, message)
  })

  self.client.on('names', function (channel, nicks) {
    var nicknames = Object.keys(nicks),
        i = 0,
        l = nicknames.length
    if (!self.settings.channels[channel]) self.settings.channels[channel] = {}
    if (!self.settings.channels[channel].users) {
      self.settings.channels[channel].users = {}
    }
    for (; i < l; ++i) {
      self.settings.channels[channel].users[nicknames[i]] = lookupUser(
        self, nicknames[i]
      )

      self.settings.channels[channel].users[nicknames[i]].level =
        nicks[nicknames[i]]
    }
  })

  self.client.on('part', function (channel, nick, reason, message) {
    if (nick === self.settings.nickname) {
      return self.emit('ziggypart', channel)
    }

    user = lookupUser(self, nick)
    delete self.settings.channels[channel].users[nick]
    self.emit('part', user, channel, reason)
  })

  self.client.on('quit', function (nick, reason, channels, message) {
    var user = lookupUser(self, nick),
        i = 0,
        l = channels.length

    for (; i < l; ++i) {
      if (self.settings.channels[channels[i]] &&
        self.settings.channels[channels[i]][nick]) {
        delete self.settings.channels[channel[i]][nick]
      }
    }
    self.emit('quit', user, reason)
  })

  self.client.on('kick', function (channel, nick, by, reason) {
    var kicked = lookupUser(self, nick),
        kicker = lookupUser(self, by)

    if (self.settings.channels[channel][nick]) {
      delete self.settings.channels[channel][nick]
    }

    self.emit('kick', kicked, kicker, channel, reason);
  })

  self.client.on('invite', function (channel, from, message) {
    var user = lookupUser(self, from)
    self.emit('invite', channel, user)
  })

  self.client.on('join', function (channel, nick, message) {
    if (nick === self.settings.nickname) {
      return self.emit('ziggyjoin', channel, message)
    }

    user = lookupUser(self, nick)
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
    return massExecute(self, 'part', channels, callback)
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
    return massExecute(self, 'join', channels, callback)
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
    callback && callback(lookupUser(self, nick))
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
  userList(this, function (list) {
    callback && callback(list)
  })
}

Ziggy.prototype.user = function Ziggy$user(nickname) {
  return lookupUser(this, nickname)
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
  var users = Object.keys(userObjects),
      i = 0,
      l = users.length;
  for (; i < l; ++i) {
    var user = users[i]
    if (!this.settings.users[user]) this.settings.users[user] = userObjects[user]
    this.settings.users[user] = extend(this.settings.users[user], userObjects[user])
  }
}

Ziggy.prototype.unregister = function Ziggy$unregister(users) {
  if (!Array.isArray(users)) {
    users = [users]
  }

  var i = 0,
      l = users.length
  for (; i < l; ++i) {
    delete this.settings.users[users[i]];
  }
}

module.exports.createZiggy = function createZiggy(options) {
  return new Ziggy(options)
}

module.exports.Ziggy = Ziggy

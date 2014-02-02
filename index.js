var EE = require('events').EventEmitter,
    irc = require('irc'),
    noop = function () {}

function Ziggy(settings) {
  if (!(this instanceof Ziggy)) return new Ziggy(settings)

  this.server = settings.server || 'irc.freenode.net'
  this.port = settings.port || 6667
  this.channels = settings.channels || []
  this.nickname = settings.nickname || 'Ziggy'
  this.plugins = settings.plugins || []
  this.password = settings.password
  this.secure = !!settings.secure

  for (var i = 0, l = this.plugins.length; i < l; ++i) {
    this.plugins[i](this)
  }

  return this
}

var cons = Ziggy,
    proto = cons.prototype = new EE

proto.start = Ziggy$start
proto.say = Ziggy$say
proto.action = Ziggy$action
proto.topic = Ziggy$topic
proto.part = Ziggy$part
proto.join = Ziggy$join
proto.whois = Ziggy$whois
proto.colorize = Ziggy$colorize
proto.disconnect = Ziggy$disconnect
proto.channel = Ziggy$channel
proto.channels = Ziggy$channels
proto.nick = Ziggy$nick
proto.mode = Ziggy$mode
proto.op = Ziggy$op
proto.deop = Ziggy$deop

function Ziggy$say(target, text) {
  return this.client.say(target, text)
}

function Ziggy$action(channel, message) {
  return this.client.action(channel, message)
}

function Ziggy$topic(channel, topic) {
  this.client.send('TOPIC', channel, topic)
}

function Ziggy$part(channels, callback) {
  var self = this

  callback = callback || noop

  self.client.part(channels, function Ziggy_parting() {
    if (self.channels[channels]) {
      delete self.channels[channels]
    }
    callback()
  })
}

function Ziggy$join(channels, callback) {
  var self = this

  callback = callback || noop

  self.client.join(channels, function () {
    if (!self.channels[channels]) {
      self.channels[channels] = {}
      callback()
    }
  })
}

function Ziggy$whois(nick, callback) {
  var self = this

  self.client.whois(nick, function (info) {
    callback && callback(null, info)
  })
}

function Ziggy$colorize(text, color) {
  return irc.colors.wrap(color, text)
}

function Ziggy$disconnect(message, callback) {
  this.client.disconnect(message, callback)
}

function Ziggy$channels() {
  return this.channels
}

function Ziggy$channel(channel) {
  return this.channels[channel]
}

function Ziggy$nick(nickname) {
  return this.client.send('NICK', nickname)
}

function Ziggy$mode(channel, mode, nick) {
  if (nick) return this.client.send('MODE', channel, mode, nick)

  return this.client.send('MODE', channel, mode)
}

function Ziggy$op(channel, nick) {
  return this.mode(channel, '+o', nick)
}

function Ziggy$deop(channel, nick) {
  return this.mode(channel, '-o', nick)
}

function Ziggy$start() {
  var self = this

  self.client = new irc.Client(
      self.server,
      self.nickname,
       { channels: self.channels,
         userName: 'ziggy',
         realName: 'Ziggy',
         password: self.password,
         selfSigned: true,
         certExpired: true,
         port: self.port,
         secure: self.secure }
  )

  self.client.on('registered', self.emit.bind(self, 'ready'))

  self.client.on('message#', function (nick, to, text, message) {
    self.emit('message', nick, to, text)
  })

  self.client.on('pm', function (nick, text, message) {
    self.emit('pm', nick, text)
  })

  self.client.on('nick', function (oldnick, newnick, channels) {
    if (oldnick === self.nickname) self.nickname = newnick

    self.emit('nick', oldnick, newnick, channels)
  })

  self.client.on('+mode', function (channel, by, mode, argument) { 
    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, by, '+' + mode, argument)
    }

    if (mode == 'o') {
      return self.emit('op', channel, by, argument)
    }

    self.emit('voice', channel, by, argument)
  })

  self.client.on('-mode', function (channel, by, mode, argument) { 
    if (mode !== 'o' && mode !== 'v') {
      return self.emit('mode', channel, by, '-' + mode, argument)
    }

    if (mode === 'o') {
      self.emit('deop', channel, by, lookupUser(self, argument))
    }

    self.emit('devoice', channel, by, lookupUser(self, argument))
  })

  self.client.on('topic', function (channel, topic, nick, message) {
    self.emit('topic', channel, topic, nick, message)
  })

  self.client.on('part', function (channel, nick, reason, message) {
    if (nick === self.nickname) {
      return self.emit('ziggypart', channel)
    }

    self.emit('part', nick, channel, reason)
  })

  self.client.on('quit', function (nick, reason, channels, message) {
    self.emit('quit', nick, reason)
  })

  self.client.on('kick', function (channel, nick, by, reason) {
    self.emit('kick', nick, by, channel, reason);
  })

  self.client.on('invite', function (channel, from, message) {
    self.emit('invite', channel, from, message)
  })

  self.client.on('join', function (channel, nick, message) {
    if (nick === self.nickname) {
      return self.emit('ziggyjoin', channel, message)
    }

    self.emit('join', channel, user, message)
  })

  self.client.addListener('error', function (message) {
    console.log('error: ', message)
  })

}
module.exports.createZiggy = function createZiggy(options) {
  return new Ziggy(options)
}

module.exports.Ziggy = Ziggy

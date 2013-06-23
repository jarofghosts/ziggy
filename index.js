var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc'),
    noop = function () {};

function massExecute(ziggy, command, items, callback) {

  callback = callback || noop;

  var i = 0,
      l = items.length;

  for (; i < l; ++i) {
    if (i !== l - 1) { callback = noop; }
    this[command](items[i], callback);
  }

}

function lookupUser(ziggy, nickname) {
  return ziggy.settings.users[nickname];
}

function Ziggy(settings) {

  this.settings = settings;
  this.client = new irc.Client(settings.server, settings.nickname,
                               { channels: settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 secure: settings.secure });

  this.client.on('registered', function () {
    this.emit('ready');
  });
  this.client.on('names', function (channel, nicks) {
    
  });
  this.client.on('join', function (channel, nick, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggyjoin', channel, message);
    } else {
      nick = lookupUser(this, nick) || { nick: nick };
      this.emit('join', channel, nick, message);
    }
  }.bind(this));
}

Ziggy.prototype.part = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'part', channels, callback);
    return;
  }

  this.client.part(channels, callback);

};

Ziggy.prototype.join = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'join', channels, callback);
    return;
  }

  this.client.join(channels, callback);
};

Ziggy.prototype.say = this.client.say;

function start(options) {
  
  var settings = {};

  settings.server = options.server || 'irc.freenode.org';
  settings.channels = options.channels || [];
  settings.nickname = options.nickname || 'Ziggy';
  settings.plugins = options.plugins || [];
  settings.password = options.password || '';
  settings.users = options.users || {};
  settings.secure = options.secure;

  return new Ziggy(settings);

}

util.inherits(Ziggy, EventEmitter);

module.exports = start;

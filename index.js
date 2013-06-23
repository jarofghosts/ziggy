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
  return {
    nick: nickname,
    info: this.settings.users[nickname]
  };
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
  this.client.on('invite', function (channel, from, message) {
    
  });
  this.client.on('join', function (channel, nick, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggyjoin', channel, message);
    } else {
      user = lookupUser(this, nick);
      this.emit('join', channel, user, message);
    }
  }.bind(this));
}

Ziggy.prototype.part = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'part', channels, callback);
    return;
  }

  this.client.part(channels, function () {
    if (this.settings.channels[channels]) {
      delete this.settings.channels[channels];
      callback();
  });

};

Ziggy.prototype.join = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'join', channels, callback);
    return;
  }

  this.client.join(channels, function () {
    if (!this.settings.channels[channels]) {
      this.settings.channels[channels] = {};
      callback();
    }
  });
};

Ziggy.prototype.whois = function (nick, callback) {
  this.client.whois(nick, function (info) {
    if (!this.settings[nick]) { this.settings[nick] = {}; }
    this.settings[nick].whois = info;
    callback && callback(lookupUser(nick));
  });
};

Ziggy.prototype.say = this.client.say;

Ziggy.prototype.disconnect = this.client.disconnect;

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

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc'),
    noop = function () {};

function populateUsers(ziggy) {
  var users = Object.keys(ziggy.settings.users),
      i = 0,
      l = users.length
  for (; i < l; ++i) {
    ziggy.settings.users[users[i]].shared = {
      userLevel: ziggy.settings.users[users[i]].userLevel,
      authenticated: false,
      whois: null
    };
  }
}

function massExecute(ziggy, command, items, callback) {

  callback = callback || noop;

  var i = 0,
      l = items.length;

  for (; i < l; ++i) {
    if (i !== l - 1) { callback = noop; }
    this[command](items[i], callback);
  }

}

function userList(ziggy, callback) {
  var users = Object.keys(this.settings.users),
      i = 0,
      l = users.length,
      userList = {};

  for (; i < l; ++i) {
    userList[this.settings.users[users[i]] = this.settings.users[users[i]].shared;
    if (i === l) { callback && callback(userList); }
  }
}

function lookupUser(ziggy, nickname) {
  var userInfo = this.settings.users[nickname] ? this.settings.users[nickname].shared : null;
  return {
    nick: nickname,
    info: userInfo
  };
}

function Ziggy(settings) {

  this.settings = settings;
  populateUsers(this);

  this.client = new irc.Client(settings.server, settings.nickname,
                               { channels: settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 secure: settings.secure });

  this.client.on('registered', function () {
    this.emit('ready');
  });
  this.client.on('topic', function (channel, topic, nick, message) {
    
    this.settings.channels[channel].topic = {
      text: topic,
      setBy: lookupUser(this, nick)
    };

    this.emit('topic', channel, topic, nick, message);
  }.bind(this));
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
    this.settings.users[nick].shared.whois = info;
    callback && callback(lookupUser(this, nick));
  }.bind(this));
};

Ziggy.prototype.say = this.client.say;

Ziggy.prototype.disconnect = this.client.disconnect;

Ziggy.prototype.channels = function () {
  return this.settings.channels;
};

Ziggy.prototype.channel = function (channel) {
  return this.settings.channels[channel];
};

Ziggy.prototype.users = function (callback) {
  userList(this, function (list) {
    callback && callback(list);
  });
};

Ziggy.prototype.user = function (nickname) {
  return lookupUser(this, nickname);
};

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

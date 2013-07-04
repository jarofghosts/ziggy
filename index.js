var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc'),
    extend = require('xtend'),
    noop = function () {};
function Ziggy(settings) {

  this.settings = {};

  this.settings.server = settings.server || 'irc.freenode.net';
  this.settings.channels = settings.channels || [];
  this.settings.nickname = settings.nickname || 'Ziggy';
  this.settings.plugins = settings.plugins || [];
  this.settings.password = settings.password || '';
  this.settings.secure = settings.secure === undefined ? false : !!settings.secure;

  populateUsers(this, (settings.users || {}));
  activatePlugins(this);

  return this;

}

util.inherits(Ziggy, EventEmitter);

Ziggy.prototype.start = function () {
  this.client = new irc.Client(this.settings.server, this.settings.nickname,
                               { channels: this.settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 secure: this.settings.secure });

  this.client.on('registered', function () {
    this.emit('ready');
  }.bind(this));

  this.client.on('message#', function (nick, to, text, message) {
    var user = lookupUser(this, nick);
    this.emit('message', user, to, text);
  }.bind(this));

  this.client.on('pm', function (nick, text, message) {
    var user = lookupUser(this, nick);
    if (this.settings.users[nick] && !this.settings.users[nick].shared.authenticated) {
      var bits = text.split(' '),
          command = bits[0],
          args = bits[1];
      if (command === 'auth' && this.settings.users[nick].password === args) {
        this.settings.users[nick].shared.authenticated = true;
        this.emit('authed', lookupUser(this, nick));
      }

    }

    this.emit('pm', user, text);
  }.bind(this));

  this.client.on('nick', function (oldnick, newnick, channels) {
    if (oldnick === this.settings.nickname) { this.settings.nickname = newnick; }
    if (this.settings.users[oldnick]) {
      this.settings.users[newnick] = Object.create(this.settings.users[oldnick]);
      delete this.settings.users[oldnick];
    }
    var i = 0,
        l = channels.length;

    for (; i < l; ++i) {
      this.settings.channels[channels[i]].users[newnick] = Object.create(this.settings.channels[channels[i]].users[oldnick]);
      delete this.settings.channels[channels[i]].users[oldnick];
    }

    this.emit('nick', oldnick, lookupUser(this, newnick), channels);

  }.bind(this));

  this.client.on('+mode', function (channel, by, mode, argument) { 
    var setBy = lookupUser(this, by);
    if (mode === 'o' || mode === 'v') {
      var currentLevel = this.settings.channels[channel].users[argument].level;
      if (currentLevel !== '@') {

        var userMode = '';

        if (mode == 'o') {
          this.emit('op', channel, setBy, lookupUser(this, argument));
          userMode = '@';
        } else {
          this.emit('voice', channel, setBy, lookupUser(this, argument));
          userMode = '+';
        }
        
        this.settings.channels[channel].users[argument].level = userMode;
      }
    } else {
      this.emit('mode', channel, setBy, '+' + mode, argument);
    }
  }.bind(this));
  this.client.on('-mode', function (channel, by, mode, argument) { 
    var setBy = lookupUser(this, by);
    if (mode === 'o' || mode === 'v') {
      var currentLevel = this.settings.channels[channel].users[argument].level;
      if (currentLevel !== '') {
        
        var userMode = '';

        if (mode == 'o') {
          this.emit('deop', channel, setBy, lookupUser(this, argument));
        } else {
          userMode = currentLevel == '@' ? '@' : '';
          this.emit('devoice', channel, setBy, lookupUser(this, argument));
        }

        this.settings.channels[channel].users[argument].level = userMode;
      }
    } else {
      this.emit('mode', channel, setBy, '-' + mode, argument);
    }
  }.bind(this));

  this.client.on('topic', function (channel, topic, nick, message) {
    if (!this.settings.channels[channel]) { this.settings.channels[channel] = {}; }
    this.settings.channels[channel].topic = {
      text: topic,
      setBy: lookupUser(this, nick)
    };

    this.emit('topic', channel, topic, nick, message);
  }.bind(this));
  this.client.on('names', function (channel, nicks) {
    var nicknames = Object.keys(nicks),
        i = 0,
        l = nicknames.length;
    if (!this.settings.channels[channel]) { this.settings.channels[channel] = {}; }
    if (!this.settings.channels[channel].users) { this.settings.channels[channel].users = {}; }
    for (; i < l; ++i) {
      this.settings.channels[channel].users[nicknames[i]] = lookupUser(this, nicknames[i]);
      this.settings.channels[channel].users[nicknames[i]].level = nicks[nicknames[i]];
    }
  }.bind(this));
  this.client.on('part', function (channel, nick, reason, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggypart', channel);
    } else {
      user = lookupUser(this, nick);
      delete this.settings.channels[channel].users[nick];
      this.emit('part', user, channel, reason);
    }
  }.bind(this));
  this.client.on('quit', function (nick, reason, channels, message) {
    var user = lookupUser(this, nick),
        i = 0,
        l = channels.length;

    for (; i < l; ++i) {
      if (this.settings.channels[channels[i]] && this.settings.channels[channels[i]][nick]) {
        delete this.settings.channels[channel[i]][nick];
      }
    }
    this.emit('quit', user, reason);

  }.bind(this));
  this.client.on('kick', function (channel, nick, by, reason) {
    var kicked = lookupUser(this, nick),
        kicker = lookupUser(this, by);

    if (this.settings.channels[channel][nick]) {
      delete this.settings.channels[channel][nick];
    }

    this.emit('kick', kicked, kicker, channel, reason);
  }.bind(this));
  this.client.on('invite', function (channel, from, message) {
    var user = lookupUser(this, from);
    this.emit('invite', channel, user);
  }.bind(this));
  this.client.on('join', function (channel, nick, message) {
    if (nick === this.settings.nickname) {
      this.emit('ziggyjoin', channel, message);
    } else {
      user = lookupUser(this, nick);
      this.settings.channels[channel].users[nick] = user;
      this.emit('join', channel, user, message);
    }
  }.bind(this));

  this.client.addListener('error', function (message) {
    console.log('error: ', message);
  });

}

Ziggy.prototype.say = function (target, text) {
  return this.client.say(target, text);
};

Ziggy.prototype.topic = function (channel, topic) {
  this.client.send('TOPIC', channel, topic);
};

Ziggy.prototype.part = function (channels, callback) {

  callback = callback || noop;

  if (channels instanceof Array) {
    massExecute(this, 'part', channels, callback);
    return;
  }

  this.client.part(channels, function () {
    if (this.settings.channels[channels]) {
      delete this.settings.channels[channels];
    }
    callback();
  }.bind(this));

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
  }.bind(this));
};

Ziggy.prototype.whois = function (nick, callback) {
  this.client.whois(nick, function (info) {
    if (!this.settings.users[nick]) { this.settings.users[nick] = { shared: {} }; }
    this.settings.users[nick].shared.whois = info;
    callback && callback(lookupUser(this, nick));
  }.bind(this));
};

Ziggy.prototype.colorize = function (text, color) {
  return irc.colors.wrap(color, text);
};

Ziggy.prototype.disconnect = function (message, callback) {
  this.client.disconnect(message, callback);
};

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

Ziggy.prototype.nick = function (nickname) {
  this.client.send('NICK', nickname);
};

Ziggy.prototype.level = function (channel) {
  return this.settings.channels[channel].users[this.settings.nickname].level;
};

Ziggy.prototype.mode = function (channel, mode, nick) {
  if (nick) { this.client.send('MODE', channel, mode, nick); }
  else { this.client.send('MODE', channel, mode); }
};

Ziggy.prototype.op = function (channel, nick) {
  this.mode(channel, '+o', nick);
};

Ziggy.prototype.deop = function (channel, nick) {
  this.mode(channel, '-o', nick);
};

Ziggy.prototype.register = function (users) {
  populateUsers(this, users);
};

Ziggy.prototype.update = function (userObjects) {
  var users = Object.keys(userObjects),
      i = 0,
      l = users.length;
  for (; i < l; ++i) {
    var user = users[i];
    if (!this.settings.users[user]) { this.settings.users[user] = userObjects[user]; }
    this.settings.users[user] = extend(this.settings.users[user], userObjects[user]);
  }
};

Ziggy.prototype.unregister = function (users) {
  if (!(users instanceof Array)) {
    users = [users];
  }

  var i = 0,
      l = users.length;

  for (; i < l; ++i) {
    delete this.settings.users[users[i]];
  }

};

module.exports.createZiggy = function (options) {
  return new Ziggy(options);
};

module.exports.Ziggy = Ziggy;


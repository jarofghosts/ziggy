var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc');

function Ziggy(settings) {

  this.settings = settings;
  this.client = new irc.Client(settings.server, settings.nickname,
                               { channels: settings.channels,
                                 userName: 'ziggy',
                                 realName: 'Ziggy',
                                 secure: settings.secure });

  this.client.addListener();
}

Ziggy.prototype.part = function (channels) {
  if (channels instanceof Array) {
    channels.forEach(channel) { this.part(channel); }.bind(this));
    return;
  }

  this.client.part(channels);
};

Ziggy.prototype.join = function (channels) {
  if (channels instanceof Array) {
    channels.forEach(channel) { this.join(channel); }.bind(this));
    return;
  }

  this.client.join(channels);
};

Ziggy.prototype.say = function (target, 

function start(options) {
  var settings = {};

  settings.server = options.server || 'irc.freenode.org';
  settings.channels = options.channels || [];
  settings.nickname = options.nickname || 'Ziggy';
  settings.plugins = options.plugins || [];
  settings.password = options.password || '';
  settings.groups = options.groups || {};
  settings.secure = options.secure;

  return new Ziggy(settings);
}

util.inherits(Ziggy, EventEmitter);

module.exports = start;

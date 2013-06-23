var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    irc = require('irc');

function Ziggy(settings) {
  this.client = new irc.Client
}

Ziggy.prototype

function start(options) {
  var settings = {};

  settings.server = options.server || 'irc.freenode.org';
  settings.channel = options.channel || '#test';
  settings.nickname = options.nickname || 'Ziggy';
  settings.plugins = options.plugins || [];
  settings.password = options.password || '';
  settings.groups = options.groups || {};

  return new Ziggy(settings);
}

util.inherits(Ziggy, EventEmitter);

module.exports = start;

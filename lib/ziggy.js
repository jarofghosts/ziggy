var irc = require('irc'),
  fs = require('fs'),
  Ziggy = {
    bots: [],
    plugins: [],
    version: '0.0.0'
  }

function botStrap() {
  Ziggy.bots.forEach(function (bot) {
    bot.client = new irc.Client(bot.server, bot.nickName, { channels: bot.channels })
    bot.plugins.forEach(function (plugin) {
      if (Ziggy.plugins.indexOf(plugin) === -1) {
        console.log('unknown plugin: ' + plugin)
      } else {
        Ziggy.plugins[plugin].listeners.forEach(function (listener) {
          bot.client.addListener(listener.on, listener.callback)
        })
      }
    })
  })
}

fs.readdir('./bots/', function (err, files) {
  files.forEach(function (file) {
    if (file.split('.').pop().match(/json/i)) {
      var botName = file.replace(/\.json$/i, '')
      Ziggy.bots[botName] = require('./bots/' + file)
    }
  })
})

fs.readdir('./plugins/', function (err, files) {
  files.forEach(function (file) {
    if (file.split('.').pop().match(/json/i)) {
      var pluginName = file.replace(/\.json$/i, '')
      Ziggy.plugins[pluginName] = require('./plugins/' + files)
    }
  })
  botStrap()
})

function loadBots() {
  return Ziggy.bots
}

exports.loadBots = loadBots;

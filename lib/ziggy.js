var irc = require('irc'),
  fs = require('fs'),
  Ziggy = {
    bots: [],
    plugins: [],
    version: '0.0.0'
  }

fs.readdir('./bots/', function (err, files) {
  files.forEach(function (file) {
    if (file.split('.').pop().match(/json/i)) {
      var botName = file.replace(/\.json$/i, '')
      Ziggy.bots[botName] = require('./bots/' + file)
    }
  })
})

function loadBots() {
  return Ziggy.bots;
}

exports.loadBots = loadBots;

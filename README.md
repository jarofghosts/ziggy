ziggy
===

an irc bot in node

## usage

````js
var Ziggy = require('ziggy').Ziggy,
    ziggy = new Ziggy({ server: "irc.freenode.org",
                        nickname: "Gushie",
                        channels: ["#quantumleap", "#sliderssucks"] });
````

Ta-da! You've got a bot online.

What's that? You want it to do something? Oh. Sorry. You can make a plugin for it!

## example plugin

````js
module.exports = function (ziggy) {
  ziggy.on('pm', function (user, text) {
    ziggy.say(user.nick, "Speak up, I can't hear you.");
  });
  ziggy.on('message', function (user, channel, text) {
    var bits = text.split(' '),
        command = bits.shift();
    if (command === '!reverse') {
      ziggy.say(channel, bits.reverse().join(' '));
    }
    if (command === '!upper') {
      ziggy.say(channel, bits.join(' ').toUpperCase());
    }
    if (command === '!lower') {
      ziggy.say(channel, bits.join(' ').toLowerCase());
    }
  });
  
}
````

Save something like that as, say, dumb-plugin.js and then modify your main code a bit.

````js
var Ziggy = require('ziggy').Ziggy,
    dumbPlugin = require('dumb-plugin.js'),
    ziggy = new Ziggy({ server: "irc.freenode.org",
                        nickname: "Gushie",
                        plugins: [dumbplugin],
                        channels: ["#quantumleap", "#sliderssucks"] });
````

Now we're talkin'. Pretty self-explanatory, but it will respond to all private messages with "Speak up, I can't hear you."
as well as responding to in-channel "commands" like !reverse, !upper, and !lower with the replies associated.

## API

*coming soon...*

## license
MIT

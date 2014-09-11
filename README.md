ziggy
====

[![Build Status](https://travis-ci.org/jarofghosts/ziggy.svg?branch=master)](https://travis-ci.org/jarofghosts/ziggy)

an irc bot in node

## usage

```js
var Ziggy = require('ziggy')
  , ziggy = Ziggy({
        server: 'irc.freenode.net'
      , nickname: 'Gushie'
      , channels: ['#quantumleap', '#sliderssucks']
    })

ziggy.start()
```

Ta-da! You've got a bot online.

What's that? You want it to do something? Oh. Sorry. You can make a plugin for
it!

## example plugin

```js
module.exports = function(ziggy, settings) {
  if(settings.respondToPm) {
    ziggy.on('pm', function(user, text) {
      ziggy.say(user.nick, 'Speak up, I can\'t hear you.')
    })
  }

  ziggy.on('message', function(user, channel, text) {
    var bits = text.split(' ')
      , command = bits.shift()

    if(command === '!reverse') {
      ziggy.say(channel, bits.reverse().join(' '))
    }

    if(command === '!upper') {
      ziggy.say(channel, bits.join(' ').toUpperCase())
    }

    if(command === '!lower') {
      ziggy.say(channel, bits.join(' ').toLowerCase())
    }
  })
}
```

Save something like that as, say, dumb-plugin.js and then modify your main code
a bit.

```js
var Ziggy = require('ziggy')

var dumbPlugin = require('dumb-plugin.js')
  , ziggy = Ziggy({
        server: 'irc.freenode.org'
      , nickname: 'Gushie'
      , plugins: [{
            name: 'dumb plugin'
          , setup: dumbPlugin
          , settings: {respondToPm: true}
        }]
      , channels: ['#quantumleap', '#sliderssucks']
    })

ziggy.start()
```

Now we're talkin'. Pretty self-explanatory, but if you configure it as such, it
will respond to all private messages with "Speak up, I can't hear you."
It will also respond to in-channel "commands" like !reverse, !upper, and !lower
with the replies associated.

Better yet, you can look at a fully-functioning example plugin
[here](https://github.com/jarofghosts/ziggy-example-plugin).

## as a command line tool

If you install ziggy globally (`npm install -g ziggy`), you will magically gain
access to the `ziggy` command that works like this:

`ziggy [options]`

options are:

* `--server, -s <server>` IRC server (default irc.freenode.net)
* `--port, -P <port>` Server port (default 6667)
* `--password <password>` Server password
* `--secure, -S` Use secure connection
* `--plugin, -p <filemodule>` Use ziggy plugin module
* `--nickname, -n <nick>` Set nickname (default ziggy)
* `--channel, -c <channel>` Connect to channel on startup
* `--user, -u <name:pass>` Add users for Ziggy
* `--version, -v` Print ziggy version
* `--help, -h` Print help

## users

Ziggy has a really naive sense of 'users' in so much as it will store a users
object containing their nickname, bot-specific password, their authenticated
status (defaults to true if no password is set), and their userLevel. The
userLevel is pretty much an arbitrary number that can be used to control access
in plugins. So, there really isn't any innate "level heirarchy", just use it in
whatever way makes sense to you. Or don't use it at all. Whatever.

## events

### `ready`
bot has connected to the server

### `message (user, channel, text)`
when a message is sent in a channel

### `pm (user, text)`
when a private message is received

### `nick (oldNick, user, channels)`
when a person changes their nickname

### `authed (user)`
when a Ziggy user authenticates his or herself.

### `action (user, channel, text)`
when an action is sent in a channel

### `server (text)`
when a notice is received from server

### `notice (user, to, text)`
when a notice is received. note: 'to' can be a nickname or a channel

### `mode (channel, setBy, mode, argument)`
when a mode is set

### `topic (channel, topic, nick)`
when a topic is set

### `part (user, channel, reason)`
when a person parts a channel

### `ziggypart (channel)`
when ziggy parts a channel

### `quit (user, reason, channels)`
when a user quits IRC

### `kick (kicked, kickedBy, channel, reason)`
when a person is kicked

### `invite (channel, user)`
when a channel invitation is received

### `join (channel, user)`
when a person joins a channel

### `ziggyjoin (channel)`
when the bot joins a channel

## API

### `say(to, text)`
where to can be a nickname or a channel

### `part(channels, callback)`
channels can be an array of channels or a string for a single channel

### `join(channels, callback)`
channels can be an array of channels or a string for a single channel

### `whois(nick, callback)`
perform a whois for `nick`, all of the user information will be passed as the
first argument to `callback`

### `disconnect(message, callback)`
disconnect bot from IRC with optional message

### `channels`
return list of channels

### `channel(channel)`
get info about `channel`

### `users(callback)`
calls callback with user list

### `user(nick)`
return user information

### `level(channel)`
get bot level on `channel`

### `colorize(text, color)`
returns text formatted with `color`

### `nick(newNick)`
change bot's name to `newNick`

### `mode(channel, mode, nick)`
set mode on `channel` where `nick` is optional

### `op(channel, nick)`
shortcut for `mode(channel, '+o', nick)`

### `deop(channel, nick)`
shortcut for `mode(channel, '-o', nick)`

### `register(userObject)`
add users to the registered users list- accepts an object in the same format as
`users` in the startup options.

### `action(channel, text)`
send an irc action of `text` to `channel`

### `notice(target, text)`
send a notice to a nick or channel

### `invite(nick, channel)`
send a channel invitation to nick. 
`channel` does not have to exist, but if it does, only users in the `channel`
are allowed to invite other users. If the channel mode `+i` is set, only
channel operators may invite other users.

### `update(userObject)`
update user properties for users in object, same format as `users` in the
startup.

## license

MIT

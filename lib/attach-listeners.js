module.exports = attach

function attach(ziggy) {
  ziggy.client.on('registered', function() {
    ziggy.emit('ready')
  })

  ziggy.client.on('message#', function(nick, to, text) {
    var user = ziggy.user(nick)

    ziggy.emit('message', user, to, text)
  })

  ziggy.client.on('action', function(nick, to, text) {
    var user = ziggy.user(nick)

    ziggy.emit('action', user, to, text)
  })

  ziggy.client.on('notice', function(nick, to, text) {
    if(!nick) {
      return ziggy.emit('server', text)
    }

    var user = ziggy.user(nick)

    ziggy.emit('notice', user, to, text)
  })

  ziggy.client.on('pm', function(nick, text) {
    var user = ziggy.user(nick)

    if(ziggy.settings.users[nick] && !user.info.authenticated) {
      var bits = text.split(' ')
        , command = bits[0]
        , args = bits[1]

      if(command === 'auth' && ziggy.settings.users[nick].password === args) {
        ziggy.settings.users[nick].shared.authenticated = true

        ziggy.emit('authed', ziggy.user(nick))
      }
    }

    ziggy.emit('pm', user, text)
  })

  ziggy.client.on('nick', function (oldnick, newnick, channels) {
    var channel
      , user

    if(oldnick === ziggy.settings.nickname) ziggy.settings.nickname = newnick

    if(ziggy.settings.users[oldnick]) {
      ziggy.settings.users[newnick] =
          Object.create(ziggy.settings.users[oldnick])

      delete ziggy.settings.users[oldnick]
    }

    for(var i = 0, l = channels.length; i < l; ++i) {
      channel = channels[i]
      user = ziggy.settings.channels[channel].users[oldnick]

      if(!user) continue
      user.nick = newnick

      ziggy.settings.channels[channel].users[newnick] = user

      delete ziggy.settings.channels[channels[i]].users[oldnick]
    }

    ziggy.emit('nick', oldnick, ziggy.user(newnick), channels)
  })

  ziggy.client.on('+mode', function (channel, by, mode, argument) { 
    var set_by = ziggy.user(by)
      , current_level
      , user_mode

    if(mode !== 'o' && mode !== 'v') {
      return ziggy.emit('mode', channel, set_by, '+' + mode, argument)
    }

    current_level = ziggy.settings.channels[channel].users[argument].level

    if(current_level === '@') return

    ziggy.emit(
        mode === 'o' ? 'op' : 'voice'
      , channel
      , set_by
      , ziggy.user(argument)
    )

    user_mode = mode === 'o' ? '@' : '+'
    
    ziggy.settings.channels[channel].users[argument].level = user_mode
  })

  ziggy.client.on('-mode', function (channel, by, mode, argument) { 
    var set_by = ziggy.user(by)
      , current_level

    if(mode !== 'o' && mode !== 'v') {
      return ziggy.emit('mode', channel, set_by, '-' + mode, argument)
    }

    current_level = ziggy.settings.channels[channel].users[argument].level

    if(current_level.length) {
      var user_mode = ''

      if(mode === 'o') {
        ziggy.emit('deop', channel, set_by, ziggy.user(argument))
      } else {
        user_mode = current_level == '@' ? '@' : ''
        ziggy.emit('devoice', channel, set_by, ziggy.user(argument))
      }

      ziggy.settings.channels[channel].users[argument].level = user_mode
    }
  })

  ziggy.client.on('topic', function (channel, topic, nick, message) {
    if(!ziggy.settings.channels[channel]) ziggy.settings.channels[channel] = {}

    ziggy.settings.channels[channel].topic = {
        text: topic
      , setBy: ziggy.user(nick)
    }

    ziggy.emit('topic', channel, topic, nick, message)
  })

  ziggy.client.on('names', function (channel, nicks) {
    var nicknames = Object.keys(nicks)
      , nickname

    if(!ziggy.settings.channels[channel]) ziggy.settings.channels[channel] = {}
    if(!ziggy.settings.channels[channel].users) {
      ziggy.settings.channels[channel].users = {}
    }

    for(var i = 0, l = nicknames.length; i < l; ++i) {
      nickname = nicknames[i]

      ziggy.settings.channels[channel].users[nickname] = ziggy.user(
          nickname
      )

      ziggy.settings.channels[channel].users[nickname].level = nicks[nickname]
    }
  })

  ziggy.client.on('part', function (channel, nick, reason, message) {
    if(nick === ziggy.settings.nickname) {
      return ziggy.emit('ziggypart', channel)
    }

    user = ziggy.user(nick)

    if(ziggy.settings.channels[channel].users[nick]) {
      delete ziggy.settings.channels[channel].users[nick]
    }

    ziggy.emit('part', user, channel, reason)
  })

  ziggy.client.on('quit', function (nick, reason, channels, message) {
    var user = ziggy.user(nick)
      , channel

    for(var i = 0, l = channels.length; i < l; ++i) {
      channel = channels[i]

      if(ziggy.settings.channels[channel] &&
          ziggy.settings.channels[channel][nick]) {

        delete ziggy.settings.channels[channel][nick]
      }
    }

    ziggy.emit('quit', user, reason, channels)
  })

  ziggy.client.on('kick', function (channel, nick, by, reason) {
    var kicked = ziggy.user(nick)
      , kicker = ziggy.user(by)

    if(ziggy.settings.channels[channel][nick]) {
      delete ziggy.settings.channels[channel][nick]
    }

    ziggy.emit('kick', kicked, kicker, channel, reason)
  })

  ziggy.client.on('invite', function (channel, from) {
    var user = ziggy.user(from)

    ziggy.emit('invite', channel, user)
  })

  ziggy.client.on('join', function (channel, nick, message) {
    if(nick === ziggy.settings.nickname) {
      return ziggy.emit('ziggyjoin', channel, message)
    }

    user = ziggy.user(nick)
    if(!ziggy.settings.channels[channel]) {
      ziggy.settings.channels[channel] = {users: {}}
    }

    ziggy.settings.channels[channel].users[nick] = user
    ziggy.settings.channels[channel].users[nick].level = ''

    ziggy.emit('join', channel, user, message)
  })

  ziggy.client.addListener('error', function (message) {
    console.log('error: ', message)
  })
}

var EE = require('events').EventEmitter

var test = require('tape')

var Ziggy = require('../')

test('emits ready when client is registered', function(t) {
  t.plan(1)

  var client = new EE()

  var ziggy = Ziggy({client: client})
  ziggy.start()

  ziggy.on('ready', function() {
    t.ok(true, 'emits ready')
  })

  client.emit('registered')
})

test(
    'adds users on names event, updates on nick, removes on part'
  , channel_user_test
)

function channel_user_test(t) {
  t.plan(3)

  var client = new EE()

  var ziggy = Ziggy({client: client})
  ziggy.start()

  client.emit('names', '#herp', {'derp': '+'})
  t.deepEqual(
      ziggy.settings.channels['#herp'].users
    , {
        derp: {
            nick: 'derp'
          , level: '+'
          , info: {userLevel: 0, authenticated: false}
        }
      }
    , 'adds user with channel level'
  )

  client.emit('nick', 'derp', 'merp', ['#herp'])

  t.deepEqual(
      ziggy.settings.channels['#herp'].users
    , {
        merp: {
            nick: 'merp'
          , level: '+'
          , info: {userLevel: 0, authenticated: false}
        }
      }
    , 'updates user key and nick'
  )

  client.emit('part', '#herp', 'merp')

  t.deepEqual(ziggy.settings.channels['#herp'].users, {}, 'removes user')
}

test('adds user on join event', function(t) {
  t.plan(1)

  var client = new EE()

  var ziggy = Ziggy({client: client})
  ziggy.start()

  client.emit('join', '#herp', 'derp')

  t.deepEqual(
      ziggy.settings.channels['#herp'].users
    , {
        derp: {
            nick: 'derp'
          , level: ''
          , info: {userLevel: 0, authenticated: false}
        }
      }
    , 'adds user with blank channel level'
  )
})

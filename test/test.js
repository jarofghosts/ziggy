var EE = require('events').EventEmitter

var test = require('tape')

var Ziggy = require('../').Ziggy

test('emits ready when client is registered', function(t) {
  t.plan(1)

  var client = new EE()

  var ziggy = new Ziggy({client: client})
  ziggy.start()

  ziggy.on('ready', function() {
    t.ok(true, 'emits ready')
  })

  client.emit('registered')
})

test('adds users on names event, updates on nick', function(t) {
  t.plan(2)

  var client = new EE()

  var ziggy = new Ziggy({client: client})
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
  )
})

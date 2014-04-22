var populate = require('../lib/populate-users')

var test = require('tape')

test('defaults to level 1 and authed', function(t) {
  t.plan(1)

  t.deepEqual(
      populate({'derp': {}})
    , {'derp': {shared: {userLevel: 1, authenticated: true, whois: null}}}
  )
})

test('not authed if password provided', function(t) {
  t.plan(1)

  t.deepEqual(
      populate({'derp': {password: 'lol'}})
    , {
        'derp': {
            password: 'lol'
          , shared: {
              userLevel: 1
            , authenticated: false
            , whois: null
          }
        }
      }
  )
})

test('userLevel configurable', function(t) {
  t.plan(1)

  t.deepEqual(
      populate({'derp': {userLevel: 900}})
    , {
        'derp': {
            shared: {
              userLevel: 900
            , authenticated: true
            , whois: null
          }
        }
      }
  )
})

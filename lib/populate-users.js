module.exports = populate_users

function populate_users(ziggy, users) {
  var user_names = Object.keys(users || {})
    , user

  for(var i = 0, l = user_names.length; i < l; ++i) {
    user = user_names[i]

    ziggy.settings.users[user] = users[user]
    ziggy.settings.users[user].shared = {
        userLevel: users[user].userLevel || 1
      , authenticated: users[user].password === undefined
      , whois: null
    }
  }
}

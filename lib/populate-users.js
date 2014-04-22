module.exports = populate_users

function populate_users(users) {
  var user_names = Object.keys(users || {})
    , result = {}
    , user

  for(var i = 0, l = user_names.length; i < l; ++i) {
    user = user_names[i]

    result[user] = users[user]
    result[user].shared = {
        userLevel: users[user].userLevel || 1
      , authenticated: !users[user].password
      , whois: null
    }

    if(result[user].userLevel) delete result[user].userLevel
  }

  return result
}

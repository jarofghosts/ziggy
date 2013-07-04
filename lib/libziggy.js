exports.activatePlugins = function (ziggy) {
  var i = 0,
      l = ziggy.settings.plugins.length;
  for (; i < l; ++i) {
    ziggy.settings.plugins[i](ziggy);
  }
};

exports.populateUsers = function (ziggy, myUsers) {

  if (!ziggy.settings.users) { ziggy.settings.users = {}; }

  var users = Object.keys(myUsers),
      i = 0,
      l = users.length;

  for (; i < l; ++i) {
    var thisUser = users[i];
    ziggy.settings.users[thisUser] = myUsers[thisUser];
    ziggy.settings.users[thisUser].shared = {
      userLevel: ziggy.settings.users[thisUser].userLevel,
      authenticated: ziggy.settings.users[thisUser].password === undefined,
      whois: null
    };
  }
};

exports.massExecute = function (ziggy, command, items, callback) {

  callback = callback || noop;

  var i = 0,
      l = items.length;

  for (; i < l; ++i) {
    if (i !== l - 1) { callback = noop; }
    this[command](items[i], callback);
  }

};

exports.userList = function (ziggy, callback) {
  var users = Object.keys(this.settings.users),
      i = 0,
      l = users.length,
      userList = {};

  for (; i < l; ++i) {
    userList[users[i]] = this.settings.users[users[i]].shared;
    if (i === l) { callback && callback(userList); }
  }
};

exports.lookupUser = function (ziggy, nickname) {
  var userInfo = ziggy.settings.users[nickname] ? ziggy.settings.users[nickname].shared : null;
  return {
    nick: nickname,
    info: userInfo
  };
};


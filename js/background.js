function MyCookie() {
  var check = this.isSupport();
  if (!check) {
    return
  }
  this.cookie_ = check;
}

MyCookie.prototype.isSupport = function() {
  if (!chrome.cookies) {
    return false;
  }
  return chrome.cookies;
}


MyCookie.prototype.remove = function(options, callback) {
  this.cookie_.remove(options, function(cookie) {
    callback && callback(cookie);
  });
}

MyCookie.prototype.getAll = function(options, callback) {
  this.cookie_.getAll(options, function(cookies) {
    callback && callback(cookies);
  });
}

MyCookie.prototype.set = function(options, callback) {
  this.cookie_.set(options, function(cookie) {
    callback && callback(cookie);
  });
}


MyCookie.prototype.get = function(options, callback) {
  this.cookie_.get(options, function(cookie) {
    callback && callback(cookie);
  });
}

MyCookie.prototype.removeAll = function(options, cookies, callback) {
  var self = this;
  cookies.forEach(function(cookie) {
    if (cookie.name == options.name) {
      var delete_options = {
        'name': options.name,
        'url': "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain +
          cookie.path
      }
      self.cookie_.remove(delete_options, function() {});
    }
  });
}


MyCookie.prototype.timer = function(days) {
  var timestamp = (new Date()).getTime() / 1000;
  var timer = timestamp + (3600 * 24 * days);
  return timer;
}

MyCookie.prototype.checkDebug = function(currentURL, tabId, mode) {
  var self = this;
  var DEBUG = '_fdebug';
  var targetCookies = [];
  var check_domain = currentURL.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/);
  if (check_domain == null) {
    mylog("error domain");
    return;
  }
  var last_domain = check_domain[1];
  var domain = (last_domain.indexOf("localhost") > -1) ? "localhost" : last_domain;
  var set_domain = (domain == "localhost") ? "" : last_domain;
  self.getAll({
    'domain': domain
  }, function(cookies) {
    targetCookies = cookies;
    var status = false;

    cookies.some(function(cookie) {
      if (cookie.name == DEBUG && cookie.path == '/') {
        status = true;
        return true;
      }
    });

    if (mode != "clickAction") {
      changeIcon(status, tabId);
      return;
    }


    self.removeAll({
      'domain': domain,
      'name': DEBUG
    }, targetCookies, function() {});
    if (!status) {
      self.set({
        'name': DEBUG,
        'url': currentURL,
        'domain': set_domain,
        'value': '1',
        'path': '/',
        'expirationDate': self.timer(7)
      }, function(cookie) {
        //document.getElementById('text').innerHTML = cookie;
      });
    }

    changeIcon(!status, tabId, function() {
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.reload(tab.id, {}, function() {
          console.log('reload');
        });
      });
    });

  });
}


function changeIcon(status, tabId, callback) {
  var path = status ? 'icon/on.png' : 'icon/off.png';
  var environment = status ? 'development' : 'product';
  mylog(environment);
  chrome.browserAction.setIcon({
    'path': path,
    'tabId': tabId
  }, function() {
    callback && callback();
  });
}

function mylog(text) {
  chrome.browserAction.setTitle({
    'title': text
  });
}

var cookie = new MyCookie();


chrome.cookies.onChanged.addListener(function(info) {
  console.log('cookie changed');
});

chrome.tabs.query({
  active: true,
  currentWindow: true
}, function(tabs) {
  selectedId = tabs[0].id;
});

chrome.tabs.onUpdated.addListener(function(tabId, props, tab) {
  if (props.status == "complete")
    cookie.checkDebug(tab.url, tabId, 'load')
});

chrome.tabs.onSelectionChanged.addListener(function(tabId, props) {
  chrome.tabs.getSelected(null, function(tab) {
    cookie.checkDebug(tab.url, tabId, 'onSelected')
  });
});

chrome.browserAction.onClicked.addListener(function(tab) {
  var currentURL = tab.url;
  var tabId = tab.id;
  cookie.checkDebug(currentURL, tabId, 'clickAction');
});

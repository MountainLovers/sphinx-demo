document.addEventListener("DOMContentLoaded", function () {

  // Chrome has a hardcoded popup window size limit of 800x600
  var max_window_height = 600;
  var max_qrcode_height = max_window_height - 75; // Reserve "some" space for UI

  var qr_levels = ["M", "L"];
  var qr_modules_by_version = {
    1: 21, 2: 25, 3: 29, 4: 33, 5: 37,
    6: 41, 7: 45, 8: 49, 9: 53, 10: 57
  }

  var createImage = function(payload) {
    var qr_margin = 4;

    for (var levelIndex in qr_levels) {
      for (var typeNum = 1; typeNum <= 10; typeNum++) {
        var qr_cellsize = Math.floor(max_qrcode_height / qr_modules_by_version[typeNum]);
        try {
          var qr = qrcode(typeNum, qr_levels[levelIndex]);
          qr.addData(payload);
          qr.make();
          return qr.createImgTag(qr_cellsize, qr_margin);
        } catch(e) {
          if (strStartsWith(e.message, "code length overflow")) {
            // ignore and try to use bigger QR code format
          } else {
            throw e;
          }
        }
      }
    }
  };

  var updateImage = function() {
    payload = document.getElementById("textbox").innerText;
    document.getElementById("insert-qrcode-here").innerHTML =
      createImage(payload) || "Error. URL too long?";
  };

  var strStartsWith = function(string, prefix) {
    return !string.indexOf(prefix);
  };

  document.getElementById("close").onclick = function() {
    window.close();
  };

  document.getElementById("textbox").onchange = function() {
    updateImage();
  };

  document.getElementById("textbox").onkeyup = function() {
    updateImage();
  };

  chrome.tabs.getSelected(null, function(tab) {
    var value = "unknown token";
    // send request for ClientToken to show
    chrome.runtime.sendMessage({greeting:"requestClientToken"}, function(response) {
      console.log("receive token: ", response.farewell);
      value = response.farewell;
      // console.log("value:" + value);
      document.getElementById("textbox").innerHTML = value;
      updateImage();
    });
  });
  
  new Popup();
});

var self = null;
var browser = browser || chrome;

class Popup{
  constructor() {
    this.site = '';
    this.user = '';
    this.mode = '';
    this.pwd = '';
    this.background = browser.runtime.connect();;
    // console.log("background1", this.background);
    // console.log("background2", this.background);

    // if (this.background == null) {
    //   console.log("background connect fail!!!");
    // }

    browser.tabs.query({ currentWindow: true, active: true }, this.onTabs.bind(this));

    // tabs + close
    document.getElementById("login_tab").addEventListener("click",this.switchTab.bind(this));
    document.getElementById("create_tab").addEventListener("click",this.switchTab.bind(this));
    document.getElementById("qrcode_tab").addEventListener("click",this.switchTab.bind(this));
    document.getElementById("close").addEventListener("click",this.closeWin.bind(this));
    
    document.getElementById("login_btn").addEventListener("click", this.login);
    document.getElementById("create_btn").addEventListener("click", this.register);

    self = this;
  }

  onTabs(tabs) {
    console.log("popup.js: class Sphinx onTabs");
    if (tabs[0] && tabs[0].url) {
      this.site = new URL(tabs[0].url).hostname;
      this.site = "@"+this.site;
      console.log("site:", this.site);
    }
  }

  login() {
    this.user = document.getElementById("login_uname").value;
    this.pwd = document.getElementById("login_pwd").value;

    // console.log("site when send", self.site);
    self.background.postMessage({
      mode: "login",
      user: this.user,
      pwd: this.pwd,
      site: self.site
    });
  }

  register() {
    this.user = document.getElementById("reg_uname").value;
    this.pwd = document.getElementById("reg_pwd").value;

    // console.log("site when send", self.site);
    self.background.postMessage({
      mode: "register",
      user: this.user,
      pwd: this.pwd,
      site: self.site
    });
  }

  switchTab(event) {
    document.getElementById("txt").innerHTML = "waiting...";
    let tabs = document.getElementById("tabs");
    for (let selected of tabs.getElementsByClassName('selected')) {
      selected.className="inactive";
      selected.addEventListener("click",self.switchTab.bind(self));
      selected = document.getElementById(selected.id.slice(0,-4));
      selected.className="hidden";
    }
    event.target.className="selected";
    event.target.removeEventListener("click", self.switchTab);

    this.mode = event.target.id.slice(0,-4);
    let selected = document.getElementById(this.mode);
    selected.className=null;
  }

  closeWin() {
    window.close();
  }
}


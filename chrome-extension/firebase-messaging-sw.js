// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/7.4.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.4.0/firebase-messaging.js');
// importScripts('./dist/dist.min.js');
// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  'messagingSenderId': '603051363245'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  var type = payload.data.type;
  console.log("type:", type);
  var datapayload = JSON.parse(payload.data.payload);
  console.log("datapayload:", datapayload);
  var jsonmsg = {};
  if ("token" === type) {
    console.log("token: "+datapayload.token);
    jsonmsg.type = "token";
    jsonmsg.token = datapayload.token;
  } else if ("ecpoint" === type) {
    var ecpointx = datapayload.x;
    console.log("x: "+ecpointx);
    var ecpointy = datapayload.y;
    console.log("y: "+ecpointy);
    var desp = datapayload.description;
    console.log("desp: "+desp);
    var hexbeta = ecpointx+ecpointy;

    jsonmsg.type = "ecpoint";
    jsonmsg.hexpoint = hexbeta;
  } else if ("responseK" === type) {
    var k = datapayload.k;
    console.log("k: "+k);

    jsonmsg.type = "responseK";
    jsonmsg.k = k;
  } else {
    jsonmsg.type = "unknown";
    console.log("unknown payload type");
  }

  self.clients.matchAll()
  .then(function (clients) {
    if (clients && clients.length) {
      clients.forEach(function (client) {
        client.postMessage(jsonmsg);
      })
    }
  })
});
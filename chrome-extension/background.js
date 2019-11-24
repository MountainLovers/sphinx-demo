var firebaseConfig = {
    apiKey: "AIzaSyCY_0nlZH12LZSTkf3e8YFfH9GZ_8le3co",
    authDomain: "sphinx-demo-d5cfe.firebaseapp.com",
    databaseURL: "https://sphinx-demo-d5cfe.firebaseio.com",
    projectId: "sphinx-demo-d5cfe",
    storageBucket: "sphinx-demo-d5cfe.appspot.com",
    messagingSenderId: "603051363245",
    appId: "1:603051363245:web:9bec9ca4d743e0984eef24",
    measurementId: "G-JSJTSLN0LB"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// Retrieve Firebase Messaging object.
const messaging = firebase.messaging();

// Add the public key generated from the console here.
messaging.usePublicVapidKey("BMc0SiJjwaDzMpnDOgg3tL0aGnF9qQ4lKLdcDnJlVLILr5KlhEgPTH059q-18l_YOLOSOKZGYVZMCCTHDOjkR74");

/**********************START SPHINX-UTILS******************/
const CryptoJS = require('crypto-js');
const sjcl = require('./sjcl.js');
//const sjcl = require('/home/zzjzxh/sjcl-extended/src');
const bnjs = require('bn.js');

// var passwd = "thisismypassword";    // User's password to memory
// var domain = "@mywebsite.com"          // the website identity
var one = new bnjs('1',10);
// get prime p from https://safecurves.cr.yp.to/field.html
var bnp = new bnjs('115792089210356248762697446949407573530086143415290314195533631308867097853951', 10);
var sbnp = bnjs2sjclbn(bnp);
var r = sjcl.ecc.curves.c256.r;
// console.log("bnp:   "+bnp.toString("hex"));
// console.log("sbnp:   "+sbnp.toString());
// console.log("r:   "+r.toString());

/**
 * SHA256 implemented by CryptoJS
 * @param {*} passwd_str 
 * @return {String} SHA256 Hash Result
 */
var hash = function (passwd_str) {
    var hashbits = CryptoJS.SHA256(passwd_str);
    return hashbits.toString(CryptoJS.enc.hex);
}


// Trans sjcl bn to bnjs bn
/**
 * 
 * @param {*} sjclbn 
 * @return bn:js bn object
 */
function sjclbn2bnjs(sjclbn) {
    var str = sjcl.codec.hex.fromBits(sjclbn.toBits());
    // console.log("sjclstr:"+str);
    return new bnjs(str, 16);
}
// Trans bnjs bn to sjcl bn
/**
 * 
 * @param {*} bnjsbn 
 * @return sjcl.bn bn object
 */
function bnjs2sjclbn(bnjsbn) {
    var str = bnjsbn.toString(16);
    return new sjcl.bn(str);
}

// Hash into Curve, H'()
/**
 * 
 * @param {*} passwd
 */
function hashIntoEC(passwd) {
    passwd_hex = hash(passwd);
    var curve = sjcl.ecc.curves.c256;
    // G = curve.G;
    // x = G.x;
    // y = G.y;
    // console.log("G.x:"+sjcl.codec.hex.fromBits(x.toBits()));
    // console.log("G.y:"+sjcl.codec.hex.fromBits(y.toBits()));
    // console.log("G:"+sjcl.codec.hex.fromBits(G.toBits()));

    // get y^2 = x^3+a*x+b params
    var a = new sjcl.bn(curve.a.toString());
    var bna = sjclbn2bnjs(a);
    var b = new sjcl.bn(curve.b.toString());
    var bnb = sjclbn2bnjs(b);

    // init x
    var x = new sjcl.bn(passwd_hex);
    var bnx = sjclbn2bnjs(x);

    var redp = bnjs.red(bnp);
    
    var P;

    var found = false;

    while (!found) {
        // console.log("in!");
        var bns = bnb.add(bnx.mul(bna.add(bnx.mul(bnx))));
        var reds = bns.toRed(redp);
        try {
            // try to calculate modular square root
            bny = reds.redSqrt();
            // console.log("in1!!!");
            
            // calculate point
            yy = bnjs2sjclbn(bny);
            xx = bnjs2sjclbn(bnx);
            P = new sjcl.ecc.point(
                sjcl.ecc.curves.c256,
                new sjcl.bn.prime.p256(xx.toString()),
                new sjcl.bn.prime.p256(yy.toString())
            );
            if (P.isValid()) found = true;
        } catch {
        } finally {
            bnx = bnx.add(one);
        }
    }
    return P;
}

// F_k(x) = H(x, (H'(x))^k)
/**
 * 
 * @param {String} x 
 * @param {*} k 
 * @return sjcl.point object
 */
function Fk(x, k) {
    hash_point = hashIntoEC(x);
    test = hash_point.mult(k);
    hpxk = hash_point.mult(k).toBits();
    hpxk_str = sjcl.codec.hex.fromBits(hpxk);
    str = x+hpxk_str;
    // console.log("first :"+str);
    return hash(str);
}

/**
 * generate rho, use sjcl.random. should collect entropy, but this function can work without that.
 * @return sjcl.bn object
 */
function getRho() {
    var numWords = 8;
    var rand;
    if (sjcl.random.isReady() > 0) {
        // console.log("isReady:"+sjcl.random.isReady());
        rand_bits = sjcl.random.randomWords(numWords);
        // rand = sjcl.bn.fromBits(rand_bits); another method, but don't know the difference.
        rand_str = sjcl.codec.hex.fromBits(rand_bits);
        rand = new sjcl.bn(rand_str);
        // make sure rho belong to Zq
        rand = rand.mod(r);

        // use bn:js
        // rand = new bnjs(rand_str, "hex");
        // console.log("rand    :"+rand.toString("hex"));
        return rand;
    } else {
        console.log("sjcl random not ready!");
    }
}

/**
 * calculate alpha = (H'(pwd|domain))^rho
 * @param {String} str 
 * @param {sjcl.bn} rho 
 * @return sjcl.point object
 */
function getAlpha(str, rho) {
    var EC_hash_result = hashIntoEC(str);
    var alpha = EC_hash_result.mult(rho);
    return alpha;
}

/**
 * simulate the device calculate beta, only for test protocol. 
 * @param {sjcl.point} alpha 
 * @param {sjcl.bn} k 
 * @return sjcl.point
 */
function getBetaOnDevice(alpha, k) {
    return alpha.mult(k);
}

/**
 * reconstruct rwd using beta and rho
 * @param {sjcl.point} beta 
 * @param {sjcl.bn} rho 
 * @return String rwd 
 */
function reconstructRWD(passwd, domain, beta, rho) {
    // Question: what's the difference between r and p? why use p in calculating point, while use r in calculating inverse?
    var rho_inverse = rho.inverseMod(r);
    beta_power_rho_inverse_str = sjcl.codec.hex.fromBits(beta.mult(rho_inverse).toBits());
    // console.log("second:"+passwd + domain + beta_power_rho_inverse_str);
    var rwd = hash(passwd + domain + beta_power_rho_inverse_str);
    // console.log("reconstruct rwd:"+rwd);
    return rwd;
}

/**********************END SPHINX-UTILS******************/

function sendMsgToDevice(type, data) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://fcm.googleapis.com/fcm/send", false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'key=AAAAjGipi60:APA91bExp6Dw6I33EZ-noe8UgeL3I06m2dLyINsIS6C835DSfzS6R8dJroE0cL31JEyDeHncYsHI-tRkWykB0Ji7aZimiRfhxmj_J9jb8cGBQiiyCgiKDACfc750Ffzrz_tMlEzP6ife');
    var msg = {};
    msg.type = type;
    msg.data = data;
    var payload = {};
    payload.data = msg;
    payload.to = deviceToken;
    console.log("post payload:", payload);
    xhr.send(JSON.stringify(payload));
}

// Request for permission
// messaging.requestPermission().then(function() {
//     console.log('Notification permission granted.');
//     // TODO(developer): Retrieve an Instance ID token for use with FCM.
//     messaging.getToken().then(function(currentToken) {
//         if (currentToken) {
//             console.log('Token: ' + currentToken)
//             sendTokenToServer(currentToken);
//         } else {
//             requestPermission();
//             console.log('No Instance ID token available. Request permission to generate one.');
//             setTokenSentToServer(false);
//         }
//     }).catch(function(err) {
//         console.log('An error occurred while retrieving token. ', err);
//         setTokenSentToServer(false);
//     });
// })
// .catch(function(err) {
//     console.log('Unable to get permission to notify.', err);
// });

// Global variables

var clientToken;
var deviceToken;
var rho;
var k;
var portFromCS;
var username;
var passwd;
var domain;
var rwd;

var browser = browser || chrome;

navigator.serviceWorker.register('./firebase-messaging-sw.js')
.then(function (registration) {
    console.log("In navigator.serviceWorker1");
    messaging.useServiceWorker(registration);
        
    // Request for permission
    messaging.requestPermission()
    .then(function() {
    console.log('Notification permission granted.');
    // TODO(developer): Retrieve an Instance ID token for use with FCM.
    messaging.getToken()
    .then(function(currentToken) {
        if (currentToken) {
        console.log('Token: ' + currentToken);
        clientToken = currentToken;
        sendTokenToServer(currentToken);
        } else {
        console.log('No Instance ID token available. Request permission to generate one.');
        setTokenSentToServer(false);
        }
    })
    .catch(function(err) {
        console.log('An error occurred while retrieving token. ', err);
        setTokenSentToServer(false);
    });
    })
    .catch(function(err) {
    console.log('Unable to get permission to notify.', err);
    });
});

// Handle incoming messages. Called when:
// - a message is received while the app has focus
// - the user clicks on an app notification created by a service worker
//   `messaging.setBackgroundMessageHandler` handler.
messaging.onMessage((payload) => {
    console.log('Message received. ', payload);
    // ...
});

// Callback fired if Instance ID token is updated.
messaging.onTokenRefresh(function() {
    messaging.getToken().then(function(refreshedToken) {
        console.log('Token refreshed.');
        // Indicate that the new Instance ID token has not yet been sent 
        // to the app server.
        setTokenSentToServer(false);
        // Send Instance ID token to app server.
        sendTokenToServer(refreshedToken);
    }).catch(function(err) {
        console.log('Unable to retrieve refreshed token ', err);
    });
});

// Send the Instance ID token your application server, so that it can:
// - send messages back to this app
// - subscribe/unsubscribe the token from topics
function sendTokenToServer(currentToken) {
if (!isTokenSentToServer()) {
    console.log('Sending token to server...');
    // TODO(developer): Send the current token to your server.
    setTokenSentToServer(true);
} else {
    console.log('Token already sent to server so won\'t send it again ' +
        'unless it changes');
}
}

function isTokenSentToServer() {
return window.localStorage.getItem('sentToServer') == 1;
}

function setTokenSentToServer(sent) {
window.localStorage.setItem('sentToServer', sent ? 1 : 0);
}

function requestPermission() {
    console.log('Requesting permission...');
    // [START request_permission]
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        // TODO(developer): Retrieve an Instance ID token for use with FCM.
        // [START_EXCLUDE]
        // In many cases once an app has been granted notification permission,
        // it should update its UI reflecting this.
        console.log('Get permission to notify.');
        // [END_EXCLUDE]
      } else {
        console.log('Unable to get permission to notify.');
      }
    });
    // [END request_permission]
}

// Receive msg from firebase-messaging-serviceworker.
navigator.serviceWorker.addEventListener('message', function (event) {
    console.log("receive msg from sw:", event.data);
    if (event.data.type == "ecpoint") {
        var hexbeta = event.data.hexpoint;
        console.log("hexbeta: "+hexbeta);
        var beta = sjcl.ecc.curves.c256.fromBits(sjcl.codec.hex.toBits(hexbeta));
        console.log("beta point: "+sjcl.codec.hex.fromBits(beta.toBits()));
        if (beta.isValid()) {
            console.log("success retrive beta!");
        } else {
            console.log("unsuccess retrive beta!");
        }

        console.log("DEBUG2 passwd: ", passwd);
        console.log("DEBUG2 domain: ", domain);
        console.log("DEBUG2 rho: ", rho.toString());
        var rwd2 = reconstructRWD(passwd, domain, beta, rho);
        console.log("reconstruct rwd:"+rwd2);

        // show rwd on the popup
        var views = chrome.extension.getViews({
            type: "popup"
        });
        console.log("views.length: ", views.length);
        for (var i = 0; i < views.length; i++) {
            views[i].document.getElementById('txt').innerHTML = rwd2;
        }
    } else if (event.data.type == "token") {
        deviceToken = event.data.token;
        console.log("set deviceToken: ", deviceToken);
    } else if (event.data.type == "responseK") {
        var recvk = event.data.k;
        k = new sjcl.bn(recvk);
        console.log("DEBUG recvk: ", recvk);
        console.log("DEBUG k: ", k);
        console.log("DEBUG passwd: ", passwd);
        console.log("DEBUG domain: ", domain);
        rwd = Fk(passwd+domain, k);
        console.log("DEBUG rwd: ", rwd);
        // show rwd on the popup
        var views = chrome.extension.getViews({
            type: "popup"
        });
        console.log("views.length: ", views.length);
        for (var i = 0; i < views.length; i++) {
            views[i].document.getElementById('txt').innerHTML = rwd;
        }
    } else {
        console.log("Recv unknown type from sw!");
    }
});

// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
//     console.log("background recv ", message.data);
//     chrome.runtime.sendMessage({data:deviceToken}, function(response) {

//     });
// });

// Receive msg from popup.js. Give ClientToken to popup to show the QR code.
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(sender.tab ?
                    "from a content script:" + sender.tab.url :
                    "from the extension");
        console.log("request.greeting: ", request.greeting);
        if (request.greeting == "requestClientToken"){
            console.log("send response:"+clientToken);
            sendResponse({farewell:clientToken});
            // var views = chrome.extension.getViews({
            //     type: "popup"
            // });
            // console.log("views.length: ", views.length);
            // for (var i = 0; i < views.length; i++) {
            //     views[i].document.getElementById('textbox').innerHTML = clientToken;
            // }
        }
});



browser.runtime.onConnect.addListener(function(p) {
    portFromCS = p;

    portFromCS.onMessage.addListener(function(request, sender, sendResponse) {
        username = request.user;
        passwd = request.pwd;
        domain = request.site;
        var mode = request.mode;
        if (mode == "login") {
            console.log("background login phase");
            rho = getRho();
            console.log("rho: ", rho.toString());
            var alpha = getAlpha(passwd+domain, rho);
            console.log("alpha point: "+sjcl.codec.hex.fromBits(alpha.toBits()));
            var jECPoint = {};
            jECPoint.x = sjcl.codec.hex.fromBits(alpha.x.toBits());
            jECPoint.y = sjcl.codec.hex.fromBits(alpha.y.toBits());
            jECPoint.description = "alpha";
            sendMsgToDevice("ecpoint", jECPoint);
        } else if (mode == "register") {
            sendMsgToDevice("requestK", "");
        } else {
            console.log("unknown mode");
        }
    })
})
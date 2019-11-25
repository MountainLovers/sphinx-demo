# SPHINX-DEMO-WEB

## 背景

SPHINX是一个口令管理系统，是"SPHINX: A password store that perfectly hides passwords from itself." *2017 IEEE 37th International Conference on Distributed Computing Systems"的复现，使用Firebase Cloud Messaging传递消息，无交互方式。

用到的技术/库：

- [Firebase Cloud Messaging](https://firebase.google.com/)
- [Stanford Javascript Crypto Library (sjcl)]( https://github.com/bitwiseshiftleft/sjcl/ )
- [bn.js]( https://github.com/indutny/bn.js/ )
- [CryptoJS](https://github.com/brix/crypto-js)

该系统由两部分组成：

- Client端。具体来说是一个Chrome Extension。在浏览器中运行此插件，理论上可以实现对用户的透明，插件自动检测用户的行为(注册/登录/修改密码)，并与其他设备(Android App)交互，完成操作。
- Device端。请参考👉[sphinx-demo-app](https://github.com/MountainLovers/sphinx-demo-app).

![](https://github.com/MountainLovers/sphinx-demo-web/blob/master/chrome-extension/brief-protocol.png)

## 使用方法

1. Clone本仓库到本地。

2. 在Chrome浏览器中打开[Extension](chrome://extensions/)，并启动**Developer Mode**，选择Load unpacked，选择该仓库文件夹。
3. 单击插件，使用配套APP扫描二维码后，即可注册/登录。推荐输入的密码将返回在插件popup界面。

## 原理

### 协议流程

![](https://github.com/MountainLovers/sphinx-demo-web/blob/master/chrome-extension/protocol.png)

### 项目结构

**Chrome Extension组件**

- manifest.json

  chrome extension必备组件，定义了插件的主要文件和权限等。

- background.html

  chrome extension的background界面，生存周期是从浏览器启动到关闭，生存周期最长。

- background.js

  是逻辑上background.html引用的js文件。

  主要功能：注册firebase服务、定义firebase相关组件、定义相关密码学函数(Hash into Elliptic Curve, etc.)、注册Firebase Service Worker、监听与serviceworker或者其他文件(如popup.js)的通信。

- dist/background.js

  因为使用到了其他库，所以需要用webpack打包，dist文件夹下的background.js是background.html真正引用的文件。

- popup.html & popup.css & popup.js

  定义插件的窗口。js文件中主要是1. 二维码相关函数; 2. popup中表单相关函数。

- firebase-messaging-sw.js

  定义firebase messaging的serviceworker，是后台接收消息的基础。

**二维码组件**

声明：本部分参考了 https://github.com/fxkr/chrome-qrcode-extension 。

- qrcode.js

  定义生成二维码相关的函数。

**webpack组件**

- webpack.config.js

  声明了入口是background.js，把打包的文件输出到dist/background.js。

## TODO

1. 实现论文中的对用户透明化。
2. 根据密码规则通过rwd生成可用口令。
3. 添加需要用户确认的模式。

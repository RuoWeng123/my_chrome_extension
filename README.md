# my_chrome_extension
* chromePopupPage 是用来编写chrome插件配置页面的，使用时，将项目打包后置于popup文件夹下
* localLogs 由于chrome沙河机制，chrome插件只能获取request请求部分，不能截取返回数据，故需要在localLogs中采用node来本地运行，来获取返回数据后，做数据监测服务
* manifest.json 是chrome插件的配置文件，需要在里面配置插件的名称、图标、权限等
* popup.html 是插件的配置页面，可以在里面编写html代码，来实现插件的配置页面
* scripts 插件运行在 tab 页面中的逻辑代码
* background.js 插件运行在后台service worker 中的逻辑
* test 一些测试数据。运行时生成的返回结果


## 使用流程
0. 监听时要求，监听目标对象tab，不能最后一个关闭。建议使用时，打开扩展配置程序，最后一个关闭扩展配置程序
1. chrome 扩展程序中配置需要监听的页面tab标题，对应页面需要监听的id、class、内容
2. 在chrome 扩展程序中配置需要监听的请求url，
3. 监听到页面元素溢出、url请求日志。默认存放于chrome浏览器设置的下载文件夹中
4. 将对应的input_httpLog.csv 移动到 test 目录下
5. 运行时修改http X-HW-ID   X-HW-APPKEY；值的获取请使用postman登录后获取
5. 运行 node localLogs/index.js；  input_httpLog_*.csv 是项目输入
6. 运行结果test文件件中输出为：output_httpLogs_*.xlsx 文件

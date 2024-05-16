chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: './popup/popup.html' });
});


const httpLogs = [];
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && tab.status === 'complete') {
    chrome.tabs.sendMessage(tab.id, { type: 'createTab', listenTitle: tab.title, activeTabId: tab.id }, (response) => {
      console.log('background 接受到了：',response);
      // chrome 出于安全考虑，不允许调用chrome.file 否则这里可以用于写文件
    });
  }
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.sendMessage(activeInfo.tabId, { type: 'activeTab', activeTabId: activeInfo.tabId }, (response) => {
    console.log('background 接受到了：',response);
    // chrome 出于安全考虑，不允许调用chrome.file 否则这里可以用于写文件
  });
});

// tab关闭时，
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  downloadLogToCSV();
  chrome.tabs.sendMessage(activeInfo.tabId, { type: 'removeTab', activeTabId: tabId }, (response) => {
    console.log('background 接受到了：',response);
    // chrome 出于安全考虑，不允许调用chrome.file 否则这里可以用于写文件
  });
});

function downloadLogToCSV() {

}
// background.js

// 监听以特定 URL 开头的网络请求
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // 检查请求的 URL 是否以指定的前缀开头
    if (details.url.startsWith('https://appcube.zszwfw.cn/service')) {
     // TODO 这里应该用map
      // 这里示例输出请求信息到控制台
      // console.log('请求方法:', details.method);
      // console.log('请求details:', details);
      let requestBody = details.requestBody.raw && details.requestBody.raw[0].bytes;
      const decoder = new TextDecoder('utf-8');
      const responseText = decoder.decode(requestBody);
       // console.log('请求头',responseText);
      // httpLogs = Array.from(new Set([...httpLogs, responseText]))
      // 返回 { cancel: false } 表示继续原始请求
      return { cancel: false };
    }
  },
  { urls: ['https://appcube.zszwfw.cn/service/*'] }, // 监听以指定 URL 开头的请求
  ['requestBody'] // 使用阻塞模式，需要返回一个对象
);

// 监听返回的网络请求
chrome.webRequest.onCompleted.addListener(
  function(details) {
    // 检查请求的 URL 是否以指定的前缀开头
    if (details.url.startsWith('https://appcube.zszwfw.cn/service')) {
      // console.log('监听到返回的请求:', details.url);
      // console.log('返回details:', details);
      // 返回 { cancel: false } 表示继续原始请求
      return { cancel: false };
    }
  },
  { urls: ['https://appcube.zszwfw.cn/service/*'] }, // 监听以指定 URL 开头的请求
  ['responseHeaders']
);
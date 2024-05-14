chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: './popup/popup.html' });
});

const targetTitle = '粤智慧';
const targetTabList = [];
const httpLogs = [];
function onTabChange (tab, origin) {
  if (tab.title === targetTitle && tab.active && tab.status === 'complete') {
    if(targetTabList.every(item => item.id === tab.id)) {
      targetTabList.push({id: tab.id, tab});
    }
    // 发送数据给content.js 上，content.js 用于处理dom逻辑， 在逻辑返回后，用于在下面的回调函数中，写文件
    chrome.tabs.sendMessage(tab.id, { type: 'checkRunTab' }, (response) => {
      console.log('background 接受到了：',response);
      // chrome 出于安全考虑，不允许调用chrome.file 否则这里可以用于写文件
    });
  }
};
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  onTabChange(tab, 'create');
});
chrome.tabs.onActivated.addListener((activeInfo) => {
  if(targetTabList.some(item => item.id === activeInfo.tabId)){
    let target = targetTabList.find(item => item.id === activeInfo.tabId);
    // onTabChange(target.tab, 'reActive')
  }
});
// tab关闭时，
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if(targetTabList.some(item => item.id === tabId)){
    targetTabList.splice(targetTabList.findIndex(item => item.id === tabId),1);
    // 将url log 写入文件
    downloadLogToCSV();
  }
});
// 监听来自 content.js 的消息请求
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getLocalStorage') {
    // 获取当前激活的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      let activeTab = tabs[0];
      // 向当前激活的标签页发送消息请求获取 localStorage 数据
      chrome.tabs.sendMessage(activeTab.id, { action: 'fetchLocalStorage' }, function(response) {
        sendResponse({ data: response });
      });
    });
    // 返回 true 表示异步处理
    return true;
  }
});

function downloadLogToCSV() {

}
// background.js

// 监听以特定 URL 开头的网络请求
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // 检查请求的 URL 是否以指定的前缀开头
    if (details.url.startsWith('https://appcube.zszwfw.cn/service')) {
      console.log('拦截到符合条件的请求:', details.url);

      // 在此可以根据需要修改请求或者进行其他操作
      // 如果想要拦截该请求，可以返回 { cancel: true }
      // 如果想要继续该请求，可以返回 { cancel: false }

      // 这里示例输出请求信息到控制台
      console.log('请求方法:', details.method);
      console.log('请求details:', details);
      let requestBody = details.requestBody.raw && details.requestBody.raw[0].bytes;
      const decoder = new TextDecoder('utf-8');
      const responseText = decoder.decode(requestBody);
      console.log('请求头',responseText);
      let httpInstance = {
        url: details.url,
        method: details.method,
        requestHeader: responseText
      }

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
      console.log('监听到返回的请求:', details.url);
      console.log('返回details:', details);

      // 在此可以根据需要修改请求或者进行其他操作
      // 如果想要拦截该请求，可以返回 { cancel: true }
      // 如果想要继续该请求，可以返回 { cancel: false }

      // 这里示例输出请求信息到控制台

      // 返回 { cancel: false } 表示继续原始请求
      return { cancel: false };
    }
  },
  { urls: ['https://appcube.zszwfw.cn/service/*'] }, // 监听以指定 URL 开头的请求
  ['responseHeaders']
);
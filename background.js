chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: './popup/popup.html' });
});

let config = null;
let listenTitles = [];
let listenTabIds = new Map();
let httpLogs = new Map();
let urls = [];
let urlsMap = new Map();
chrome.storage.sync.get(['cmict_chrome_extension_db'], async (result) => {
  if (result && result.cmict_chrome_extension_db) {
    console.log('background 获取到了配置：', result.cmict_chrome_extension_db);
    config = JSON.parse(result.cmict_chrome_extension_db);
    if(config){
      listenTitles = config.map(item => item.title);
      urls = config.map(item => item.url);
    }
  }
});
// tab 更新时,初始打开
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && tab.status === 'complete') {
    chrome.tabs.sendMessage(tab.id, { type: 'createTab', listenTitle: tab.title, activeTabId: tab.id }, (response) => {
      if(listenTitles.includes(tab.title)){
        listenTabIds.set(tab.id, tab.title);
        let currentConfig = config.find(item => item.title === tab.title);
        if(currentConfig){
          urlsMap.set(tab.id, currentConfig.url);
        }
        if(!httpLogs.has(tab.id)){
          httpLogs.set(tab.id, new Map())
        }
      }
    });
  }
});
// tab切换时
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.sendMessage(activeInfo.tabId, { type: 'activeTab', activeTabId: activeInfo.tabId }, (response) => {
    console.log('background 接受到了：',response);
  });
});

// tab关闭时，
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('tabId:', tabId, 'removeInfo:', removeInfo)
  if(listenTabIds.get(tabId)){
    downloadLogToCSV(tabId);
  }
  chrome.tabs.sendMessage(activeInfo.tabId, { type: 'removeTab', activeTabId: tabId }, (response) => {
    console.log('background 接受到了：',response);
  });
});
// chrome 整体关闭
chrome.windows.onRemoved.addListener((windowId) => {
  chrome.windows.getAll({}, function(windows){
    if(windows.length === 0 && listenTabIds.size > 0){
      listenTabIds.forEach((value, key) => {
        downloadLogToCSV(key);
      })
    }
  })
})

function downloadLogToCSV(tabId) {
  if(httpLogs.size === 0) return;
  if(!httpLogs.has(tabId)){
    return;
  }
  const logsArray = Array.from(httpLogs.get(tabId).values());
  let tabTitle = listenTabIds.get(tabId);
  let csvContent = "body,method,boid,tabTitle\n"; // CSV 表头
  
  logsArray.forEach(log => {
    const { body, method } = log;
    const csvLine = `"${JSON.stringify(body).replace(/"/g, '""')}",${method},${body.boid},${tabTitle}\n`; // 处理特殊字符和引号
    csvContent += csvLine;
  });
  const fileName = `input_httpLogs_${new Date().getTime()}.csv`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  // 准备下载
  const reader = new FileReader();
  reader.onload = function() {
    const dataUrl = reader.result;
    
    chrome.downloads.download({
      url: dataUrl,
      filename: fileName,
      conflictAction: 'overwrite',
      saveAs: false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        console.log('Download started with ID:', downloadId);
      }
    });
  };
  reader.readAsDataURL(blob);
  
  listenTabIds.delete(tabId);
  httpLogs.delete(tabId);
}

// 监听以特定 URL 开头的网络请求
// chrome80后沙盒机制，不允许获取请求的body，所以不监听 chrome.webRequest.onCompleted
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    let currentUrl = urlsMap.get(details.tabId);
    if (details.url.startsWith(currentUrl) && details.url.endsWith('requestdata')) {
      let requestBody = details.requestBody.raw && details.requestBody.raw[0].bytes;
      const decoder = new TextDecoder('utf-8');
      const responseText = decoder.decode(requestBody);
      const httpBody = JSON.parse(responseText);
      httpLogs.get(details.tabId).set(httpBody.boid, {body: httpBody, method: details.method, url: details.url});
      return { cancel: false };
    }
  },
  { urls: urls }, // 监听以指定 URL 开头的请求
  ['requestBody'] // 使用阻塞模式，需要返回一个对象
);


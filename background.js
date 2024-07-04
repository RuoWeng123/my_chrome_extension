chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: './popup/popup.html' });
});

let listenTitles = [];
let listenTabIds = new Map();
let httpLogs = new Map();
let dbUrl = {
  urlStart: 'https://appcube.zszwfw.cn/*'
};
// 监听tab 的title
chrome.storage.sync.get(['cmict_chrome_extension_db'], async (result) => {
  if (result && result.cmict_chrome_extension_db) {
    console.log('background 获取到了配置：', result.cmict_chrome_extension_db);
    config = JSON.parse(result.cmict_chrome_extension_db);
    if (config) {
      listenTitles = config.map(item => item.title);
    }
  }
});
// 获取配置url
chrome.storage.sync.get(['cmict_chrome_extension_db_url'], async (result) => {
  if (result && result.cmict_chrome_extension_db_url) {
    console.log('background 获取到了URL配置：', result.cmict_chrome_extension_db_url);
    dbUrl = JSON.parse(result.cmict_chrome_extension_db_url);
  }
});
// tab 更新时,初始打开
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && tab.status === 'complete') {
    chrome.tabs.sendMessage(tab.id, { type: 'createTab', listenTitle: tab.title, activeTabId: tab.id }, (response) => {
      if(listenTitles.includes(tab.title) || (dbUrl.isGlobalListen && tab.url.startsWith(dbUrl.urlStart)) ){
        listenTabIds.set(tab.id, {title: tab.title, url: tab.url});
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
  chrome.tabs.sendMessage(removeInfo.tabId, { type: 'removeTab', activeTabId: tabId }, (response) => {
    console.log('background 接受到了：',response);
  });
});


function downloadLogToCSV(tabId) {
  if(httpLogs.size === 0) return;
  if(!httpLogs.has(tabId)){
    return;
  }
  let tabTitle = listenTabIds.get(tabId);
  let csvContent = "body\n"; // CSV 表头
  httpLogs.get(tabId).forEach((value, key) => {
    const csvLine = `${JSON.stringify(value).replace(/,/g, '￥')}\n`;
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
    const {urlStart, urlEnd} = dbUrl;
    if (details.url.startsWith(urlStart) && details.url.endsWith(urlEnd)) {
      let requestBody = details.requestBody.raw && details.requestBody.raw[0].bytes;
      const decoder = new TextDecoder('utf-8');
      const responseText = decoder.decode(requestBody);
      const httpBody = JSON.parse(responseText);
      httpLogs.get(details.tabId).set(responseText, httpBody);
      return { cancel: false };
    }
  },
  { urls: [dbUrl.urlStart] }, // 监听以指定 URL 开头的请求
  ['requestBody'] // 使用阻塞模式，需要返回一个对象
);


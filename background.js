chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: './popup/popup.html' });
});

const targetTitle = '粤智慧';
const targetTabList = [];
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
    onTabChange(target.tab, 'reActive')
  }
});
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if(targetTabList.some(item => item.id === tabId)){
    targetTabList.splice(targetTabList.findIndex(item => item.id === tabId),1);
  }
});

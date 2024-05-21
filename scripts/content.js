let targetTitles = [];
let activeTabId = 0;
let targetTabIds = [];
let elIds = [];
let elClasses = [];
let mutationObserver = null;
let debounceTimer;
let timeout = null;
// 监听来自background.js的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (targetTitles.length === 0 && message.hasOwnProperty('type') && message.type === 'createTab') {
    let listenTitle = message.listenTitle;
    activeTabId = message.activeTabId;
    getIndexDb(listenTitle, activeTabId);
  }
  if (message.hasOwnProperty('type') && message.type === 'activeTab' && targetTabIds.includes(message.activeTabId)) {
    console.log('页面重新激活了')
    activeTabId = message.activeTabId;
    await checkPageStructure();
  }
  if (message.hasOwnProperty('type') && message.type === 'removeTab') {
    let removeTabId = message.activeTabId;
    targetTabIds = targetTabIds.filter(tabId => tabId !== removeTabId);
    mutationObserver && mutationObserver.disconnect();
  }
});
// 获取popup.html 传递过来的 localStorage 数据
const getIndexDb = (listenTitle, activeTabId) => {
  chrome.storage.sync.get(['cmict_chrome_extension_db'], async (result) => {
    if (result && result.cmict_chrome_extension_db) {
      const pageTitle = document.title;
      const pageConfig = JSON.parse(result.cmict_chrome_extension_db);
      targetTitles = pageConfig.map(item => item.title);
      let targetConfig = pageConfig.find(item => item.title === pageTitle);
      if(!targetConfig) return;
      elIds = targetConfig.config.ids;
      elClasses = targetConfig.config.classes;

      if (targetTitles.includes(listenTitle)) {
        // 采用set 避免重复
        targetTabIds.push(activeTabId);
        targetTabIds = [...new Set(targetTabIds)];
        console.log('页面首次加载，开始监听页面')
        timeout = setTimeout(async () =>{
          await checkPageStructure();
        }, 3000)
        listenDomChange();
      }
      // 使用配置项 result.config 进行相应的操作
    } else {
      console.log('cmict 自动巡查没有配置，不监听页面')
    }
  });
}

const checkPageStructure = async () => {
  console.log('我要开始检查页面结构了，目标页面是：', targetTitles)
  if (targetTitles.length === 0 || !targetTabIds.includes(activeTabId)) return;
  const targetEls = getTargetEls();
  if (targetEls.length === 0) return;
  let overlayList = [];
  let beyondList = [];
  for (let targetEl of targetEls) {
    let isOverlay = checkOverlay(targetEl, targetEl.brothers);
    if (isOverlay === true) {
      overlayList.push(targetEl);
      continue;
    }
    // 重叠的情况下，不检查溢出
    if (checkIsBeyondParents(targetEl, targetEl.parents)) {
      beyondList.push(targetEl);
    }
  }
  if (overlayList.length > 0 && beyondList.length === 0) {
    downloadLog(`元素重叠##${overlayList.map(el => el.textContent).join(',')}`);
  } else if (overlayList.length === 0 && beyondList.length > 0) {
    downloadLog(`元素溢出##${beyondList.map(el => el.textContent).join(',')}`);
  } else if (overlayList.length > 0 && beyondList.length > 0) {
    downloadLog(`重叠并且溢出##${overlayList.map(el => el.textContent).join(',')}`);
  }
}
// 下载日志
const downloadLog = (text) => {
  const blob = new Blob([text], { type: 'text/plain' });
  const filename = `yuezhihui_page_${new Date().getTime()}.txt`;
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(blob);
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

}
const getTargetEls = () => {
  let targetEls = [];
  elIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      let parents = getTargetElParents(el);
      let brothers = getBrothers(el);
      el.parents = parents;
      el.brothers = brothers;
      targetEls.push(el);
    }
  });
  elClasses.forEach(className => {
    const els = document.getElementsByClassName(className);
    if (els.length) {
      Array.from(els).forEach(el => {
        let parents = getTargetElParents(el);
        let brothers = getBrothers(el);
        el.parents = parents;
        el.brothers = brothers;
      })
      targetEls.push(...els);
    }
  });
  console.log('检测到页面需要监听的元素：', targetEls)
  return [...new Set(targetEls)];
};
const getTargetElParents = (targetEl) => {
  // 向上获取目标 3层父元素
  const elParents = [];
  // 向上递归3次，找到父元素
  let parent = targetEl.parentElement;
  for (let i = 0; i < 3; i++) {
    if (parent) {
      elParents.push(parent);
      parent = parent.parentElement;
    }
  }
  return [...new Set(elParents)];
}
// 从三层父元素上获取兄弟元素 集合
const getBrothers = (targetEl) => {
  const brothers = [];
  Array.from(targetEl.parentElement.children).forEach(brother => {
    if(brother.textContent.trim() !== targetEl.textContent.trim()){
      brothers.push(brother);
    }
  });
  return [...new Set(brothers)].filter(brother => brother !== targetEl);
}
// 判断元素是否与兄弟元素重叠
// 实际检查过程中，边界塌陷会导致重叠检查不准确
const checkOverlay = (targetEl, brothers) => {
  let isOverlay = false;
  for(let brother of brothers){
    if (isBoundingBoxOverlap(targetEl, brother) || isPixelOverlap(targetEl, brother)) {
      isOverlay = true;
      return isOverlay;
    }
  }
};
// 重叠检查方式1
function isBoundingBoxOverlap(el1, el2) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();
  
  return !(rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom);
}

// 重叠检查方式2
function isPixelOverlap(el1, el2) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();
  
  const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
  const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
  
  const overlapArea = xOverlap * yOverlap;
  const totalArea = (rect1.width * rect1.height) + (rect2.width * rect2.height);
  const overlapPercentage = overlapArea / totalArea;
  
  return overlapPercentage > 0; // 判断重叠面积是否大于0
}

// 判断超出父元素
const checkIsBeyondParents = (targetEl, parentEls) => {
  let isBeyond = false;
  const targetRect = targetEl.getBoundingClientRect();
  for (let parentEl of parentEls) {
    const parentRect = parentEl.getBoundingClientRect();
    if (
      targetRect.left < parentRect.left ||
      targetRect.right > parentRect.right ||
      targetRect.top < parentRect.top ||
      targetRect.bottom > parentRect.bottom ||
      targetEl.scrollWidth > parentEl.offsetWidth
    ) {
      isBeyond = true;
      return isBeyond;
    }
  }
  return isBeyond;
}
const debounce = (func, delay) => {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};
const debounceCheckPageStructure = debounce(checkPageStructure, 2000);

const listenDomChange = () => {
  // 创建一个 MutationObserver 实例
  mutationObserver = new MutationObserver((mutations) => {
    debounceCheckPageStructure();
  });

  // 配置要观察的变动类型
  const config = { attributes: false, childList: true, subtree: true };
  // 选择目标节点
  const targetNode = document.getElementById('sk_id_layout_grid') || document.body;
  // 开始观察目标节点
  mutationObserver.observe(targetNode, config);

  // 你可以在合适的时候停止观察
  // observer.disconnect();
}

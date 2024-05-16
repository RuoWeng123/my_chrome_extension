let targetTitles = [];
let activeTabId = 0;
let targetTabIds = [];
let elIds = [];
let elClasses = [];
let mutationObserver = null;
let debounceTimer;
let targetDocument = document;
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
      console.log('cmict localstorage:', result);
      const pageConfig = JSON.parse(result.cmict_chrome_extension_db);
      targetTitles = pageConfig.map(item => item.title);
      elIds = pageConfig[0].config.ids;
      elClasses = pageConfig[0].config.classes;

      if (targetTitles.includes(listenTitle)) {
        // 采用set 避免重复
        targetTabIds.push(activeTabId);
        targetTabIds = [...new Set(targetTabIds)];
        console.log('页面首次加载，开始监听页面')
        await checkPageStructure();
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
    let isOverlay = await checkOverlay(targetEl, targetEl.brothers);
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
    const el = targetDocument.getElementById(id);
    if (el) {
      let parents = getTargetElParents(el);
      let brothers = getBrothers(el, parents);
      el.parents = parents;
      el.brothers = brothers;
      targetEls.push(el);
    }
  });
  elClasses.forEach(className => {
    const els = targetDocument.getElementsByClassName(className);
    if (els.length) {
      Array.from(els).forEach(el => {
        let parents = getTargetElParents(el);
        let brothers = getBrothers(el, parents);
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
const getBrothers = (targetEl, parents) => {
  // 父元素向下寻找3层 所有子元素
  const brothers = [];
  // 寻找3层子元素，递归寻找
  parents.forEach(parent => {
    const children = parent.children;
    if (children.length) {
      brothers.push(...children);
      Array.from(children).forEach(child => {
        if (child.children.length) {
          brothers.push(...child.children);
          Array.from(child.children).forEach(grandChild => {
            if (grandChild.children.length) {
              brothers.push(...grandChild.children);
            }
          });
        }
      });
    }
  });
  // 将brothers 去重，同时去除目标元素
  return [...new Set(brothers)].filter(brother => brother !== targetEl);
}
// 判断元素是否与兄弟元素重叠
const checkOverlay = (targetEl, brothers) => {
  return new Promise((resolve) => {
    let isOverlay = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // 元素与兄弟元素重叠
          isOverlay = true;
          break; // 找到重叠即可，跳出循环
        }
      }
      observer.disconnect(); // 停止观察，避免内存泄漏
      resolve(isOverlay); // 解决 Promise，并传递结果
    }, {
      root: targetEl.parentElement,
      threshold: 1.0,
    });

    brothers.forEach(brother => {
      observer.observe(targetEl, {
        target: brother,
      });
    });
  });
};
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
    console.log('dom发生了变化', mutations)
    // debounceCheckPageStructure();
  });

  // 配置要观察的变动类型
  const config = { attributes: false, childList: true, subtree: true };

  // 选择目标节点
  const iframe = document.getElementById("preview_frame");
  const targetNode = document.body;
  if(iframe){
    const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    targetNode = iframeDocument ? iframeDocument.body : document.body;
    targetDocument = iframeDocument ? iframeDocument : document
  }

  // 开始观察目标节点
  mutationObserver.observe(targetNode, config);

  // 你可以在合适的时候停止观察
  // observer.disconnect();

}
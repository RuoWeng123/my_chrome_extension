const targetTitle = '';
const elIds = [];
const elClasses = [];
// 监听来自background.js的消息
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  getIndexDb();
  if (document.title !== targetTitle) {
    sendResponse('content.js 收到消息,但是你不是我的目标，我不给你返回消息');
  } else {
    // 初始化执行一次
    await checkPageStructure();
    // 后续监听页面url变化后，执行
    changeUrl()
  }
});
const getIndexDb = () =>{
  chrome.runtime.sendMessage({ action: 'getLocalStorage' }, function(response) {
    if (response && response.data) {
      let localStorageData = JSON.parse(response.data);
      if(localStorageData.length === 0){
        return;
      }
      targetTitle = localStorageData[0].title;
      elIds = localStorageData[0].config.ids;
      elClasses = localStorageData[0].config.classes;
      console.log('从 popup.html 获取的 localStorage 数据:', localStorageData);
    } else {
      console.log('无法获取 localStorage 数据');
    }
  });
}
// 监测页面路由变化，变化后执行检测页面元素逻辑；
const changeUrl = () =>{
  window.onhashchange = async function(){
    await checkPageStructure();
  }
}
const checkPageStructure = async () => {
  console.log('我要开始检查页面结构了，目标页面是：', targetTitle)
  const targetEls = getTargetEls();
  let overlayList = [];
  let beyondList = [];
  for(let targetEl of targetEls){
    let isOverlay = await checkOverlay(targetEl, targetEl.brothers);
    if(isOverlay === true){
      overlayList.push(targetEl);
      continue;
    }
    // 重叠的情况下，不检查溢出
    if(checkIsBeyondParents(targetEl, targetEl.parents)){
      beyondList.push(targetEl);
    }
  }
  if(overlayList.length > 0 && beyondList.length === 0){
    downloadLog(`元素重叠##${overlayList.map(el => el.textContent).join(',')}`);
  }else if(overlayList.length === 0 && beyondList.length > 0){
    downloadLog(`元素溢出##${beyondList.map(el => el.textContent).join(',')}`);
  }else if(overlayList.length > 0 && beyondList.length > 0){
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
      let brothers = getBrothers(el, parents);
      el.parents = parents;
      el.brothers = brothers;
      targetEls.push(el);
    }
  });
  elClasses.forEach(className => {
    const els = document.getElementsByClassName(className);
    if (els.length) {
      Array.from(els).forEach(el =>{
        let parents = getTargetElParents(el);
        let brothers = getBrothers(el, parents);
        el.parents = parents;
        el.brothers = brothers;
      })
      targetEls.push(...els);
    }
  });
  
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
  for(let parentEl of parentEls){
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

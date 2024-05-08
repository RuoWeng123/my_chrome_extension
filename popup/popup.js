// 这个页面用来配置，将数据写入到 storage  或者 indexDb中，页面交互的基本逻辑
const input = document.getElementById('inputTitle');
input.addEventListener('change', (event) => {
  console.log('input value', event.target.value);
});

import Dexie from 'dexie'
export const db = new Dexie('cmict_chrome_extension_db')
db.version(1).stores({
  urls: '++id, urlStart, urlEnd, isGlobalListen, createdAt, updatedAt',
  pages: '++id, customId, title, content, createdAt, updatedAt',
  configs: '++id, pageId, ids, classes, keywords, createdAt, updatedAt',
})

db.on('populate',function(transaction){
  transaction.pages.add({
    customId: '1',
    title: '粤智慧',
    content: '粤智慧是一个处理政务的数据',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  transaction.urls.add({
    urlStart: 'https://yzh.zszwfw.cn/',
    urlEnd: '/requestdata',
    isGlobalListen: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
})

db.open();

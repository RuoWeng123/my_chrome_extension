import Dexie from 'dexie'
export const db = new Dexie('cmict_chrome_extension_db')
db.version(1).stores({
  pages: '++id, customId, title, content, url, createdAt, updatedAt',
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
})

db.open();

import { db } from './db'

export const addPage = async (page) => {
  let params = {
    constomId: page.constomId,
    title: page.title,
    content: page.content,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  return await db.pages.add(params)
}

export const putPage = async (page) => {
  let params = {
    id: page.id,
    constomId: page.constomId,
    title: page.title,
    content: page.content,
    createdAt: page.createdAt,
    updatedAt: new Date()
  }
  await db.pages.put(params,params.id)
}
export const getPage = async (pageId) => {
  return await db.pages.get({ pageId })
}
export const getPageList = async () => {
  let pageList = await db.pages.toArray()
  if(pageList.length === 0) {
    let initPage = {
      constomId: '1',
      title: '粤智慧',
      content: '粤智慧是一个处理政务的数据',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    let id = await addPage(initPage)
    initPage.id = id
    return [initPage]
  }
  return pageList
}

export const addConfig = async (config) => {
  await db.configs.add(config)

  await writeDbInStorage();
}
export const putConfig = async (config) => {
  let params = {
    id: config.id,
    pageId: config.pageId,
    ids: config.ids,
    classes: config.classes,
    keywords: config.keywords,
    createdAt: config.createdAt,
    updatedAt: new Date()
  }
  await db.configs.update(params.id, params)
  

  await writeDbInStorage();
}
export const getConfigByPageId = async (pageId) => {
  let config =  await db.configs.where({ pageId }).first()
  return config
}
const getConfigList = async () => {
  return await db.configs.toArray()
}
export const removePage = async (pageId) => {
  try {
    // 先删除子数据
    await db.transaction('rw', ['configs'], async () => {
      await db.configs.where('pageId').equals(pageId).delete();
    });

    // 再删除父级数据
    await db.transaction('rw', ['pages'], async () => {
      await db.pages.where('id').equals(pageId).delete();
    });

    await writeDbInStorage();
  } catch (error) {
    // 如果有任何操作失败，则回滚所有操作
    await db.transaction('rw', ['configs', 'pages'], async () => {
      await db.configs.where('pageId').equals(pageId).restore();
      await db.pages.where('id').equals(pageId).restore();
    });

    throw error;
  }
}

const writeDbInStorage = async () =>{
  let pages = await getPageList()
  const configs = await getConfigList()
  if(pages.length === 0 || configs.length === 0){
    return
  }

  let params = pages.map(item =>{
    let config = configs.find(config => config.pageId === item.id)
    return {
      id: item.id,
      customId: item.customId,
      title: item.title,
      content: item.content,
      config: config
    }
  })

  localStorage.setItem('cmict_chrome_extension_db', JSON.stringify(params))
}
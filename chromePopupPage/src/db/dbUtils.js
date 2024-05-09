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
  await db.configs.put(params, params.pageId)
}
export const getConfigByPageId = async (pageId) => {
  return await db.configs.where({ pageId }).first()
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
  } catch (error) {
    // 如果有任何操作失败，则回滚所有操作
    await db.transaction('rw', ['configs', 'pages'], async () => {
      await db.configs.where('pageId').equals(pageId).restore();
      await db.pages.where('id').equals(pageId).restore();
    });

    throw error;
  }
}
<template>
  <div class="container">
    <div class="url_container">
      <div class="left">
        <span class="urlLabelStart">检测路由头</span>
        <el-input v-model="listenUrlStart" style="width: 400px;margin-left:20px;"
          placeholder="请输入监听网络的url"></el-input>
        <span class="urlLabelEnd">检测路由尾</span>
        <el-input v-model="listenUrlEnd" style="width: 200px;margin-left:20px;"
          placeholder="请输入监听网络的url"></el-input>
        <el-checkbox class="ml16" v-model="isGlobalListenUrl" label="全局模糊匹配" title="开启后，监听url时，不与下面配置取交集了"/>
      </div>
      <div class="action">
        <el-button class="ml32" type="primary" @click="onSaveUrl">保存路由配置</el-button>
      </div>
    </div>
    <div class="config_container">
      <div class="left_tabs">
        <div class="item_tab" v-for="item in editableTabs" :key="item.customId" @click="onActiveTab(item)">
          <span class="label">{{ item.title }}</span>
          <el-icon class="item_icon" v-if="allowClose" @click="handleTabsEdit(item.customId, 'remove')">
            <CloseBold />
          </el-icon>
        </div>
        <el-button type="primary" @click="handleTabsEdit(null, 'add')">新增监控页面</el-button>
      </div>
      <div class="right_tab_config_null" v-if="!activeTab">
        <span>请点击左侧监控页面进行配置</span>
      </div>
      <div class="right_tab_config" v-if="activeTab">
        <div class="name_area">
          <span class="label">监控页面</span>
          <el-input v-model="activeTab.title" style="width: 300px"></el-input>
        </div>
        <PageConfig
          class="ex_container"
          :pageId="activeTab.id"
          :customId="activeTab.customId"
          :title="activeTab.title"
          :content="activeTab.content"
        />
      </div>
    </div>

  </div>

</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import type { TabPaneName } from 'element-plus'
import { ElInput, ElMessage } from 'element-plus'
import { getPageList, putPage, addPage, putUrl, getUrlById } from '../db/dbUtils'
import PageConfig from '../components/PageConfig.vue'

let tabIndex = 1
const listenUrlStart = ref('https://yzh.zszwfw.cn/')
const listenUrlEnd = ref('/requestdata')
const isGlobalListenUrl = ref(true)
const editableTabs = ref([
  {
    id: 0,
    customId: '1',
    title: 'Tab 1',
    content: 'Tab 1 content'
  }
])
const activeTab = ref(null)
const allowClose = computed(() => editableTabs.value.length > 1)
onMounted(async () => {
  let pageList = await initPageList()
  let dbUrl = await getUrlById(1)
  listenUrlStart.value = dbUrl.urlStart
  listenUrlEnd.value = dbUrl.urlEnd
  isGlobalListenUrl.value = dbUrl.isGlobalListen
  if (pageList.length === 0) {
    return
  }
  activeTab.value = pageList[0]
})
const initPageList = async () => {
  let pageList = await getPageList()
  editableTabs.value = pageList
  return pageList
}
const handleTabsEdit = (targetName: TabPaneName | undefined, action: 'remove' | 'add') => {
  if (action === 'add') {
    const newTabName = `${++tabIndex}`
    editableTabs.value.push({
      id: undefined,
      title: '新页面',
      customId: newTabName,
      content: '监测页面名称'
    })
    activeTab.value = newTabName
  } else if (action === 'remove') {
    const tabs = editableTabs.value
    if (tabs.length === 1) return
    let activeName = activeTab.value
    if (activeName === targetName) {
      tabs.forEach((tab, index) => {
        if (tab.customId === targetName) {
          const nextTab = tabs[index + 1] || tabs[index - 1]
          if (nextTab) {
            activeName = nextTab.customId
          }
        }
      })
    }

    activeTab.value = activeName
    editableTabs.value = tabs.filter((tab) => tab.customId !== targetName)
  }
}

const handleSave = async () => {
  let target = editableTabs.value.find((item) => item.customId === activeTab.value)
  if (target.id) {
    await putPage(target)
  } else {
    let res = await addPage(target)
    initPageList()
  }
}

const onActiveTab = (tab: any) => {
  activeTab.value = tab
}

const onSaveUrl = async () => {
  await putUrl({
    id: 1,
    urlStart: listenUrlStart.value,
    urlEnd: listenUrlEnd.value,
    isGlobalListen: isGlobalListenUrl.value,
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  })

  alert('success')
}
</script>

<style lang="less">
.container {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .url_container {
    width: 100%;
    height: 60px;
    display: inline-flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;

    .left{
      display: inline-flex;
      flex-direction: row;
      align-items: center;
    }

    .urlLabelStart {
      margin-right: 10px;
    }

    .urlLabelEnd {
      margin-right: 10px;
      margin-left: 16px;
    }
  }

  .config_container {
    width: 100%;
    height: calc(100% - 60px);
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    border-top: 1px solid #d3d3d3;

    .left_tabs {
      width: 200px;
      height: 100%;
      display: inline-flex;
      flex-direction: column;
      border-right: 1px solid #dbd3d3;
      padding: 8px 12px;

      .item_tab {
        width: 100%;
        display: inline-flex;
        justify-content: space-between;
        padding: 4px 10px;
        background: #dbd3d3;
        margin-bottom: 12px;
        border-radius: 6px;

        .label {
          margin-right: 10px;
        }

        .item_icon {
          width: 32px;
          height: 32px;
        }
      }

      &:hover {
        background: #dbd3d3;
      }
    }

    .right_tab_config {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .name_area {
        padding: 10px 0px 14px 10px;
        border-bottom: 1px solid #dbd3d3;
        display: flex;
        flex-direction: row;
        align-items: center;

        .label {
          margin-right: 10px;
        }

        .ml32 {
          margin-left: 32px;
        }
      }

      .ex_container {
        flex: 1;
      }
    }
  }
}

.ml16{
  margin-left: 16px;
}
</style>

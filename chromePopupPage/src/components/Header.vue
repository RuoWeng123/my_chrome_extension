<template>
  <el-tabs v-model="activeTab" type="card" editable class="demo-tabs" @edit="handleTabsEdit">
    <el-tab-pane
      v-for="item in editableTabs"
      :key="item.customId"
      :label="item.title"
      :name="item.customId"
      :closeable="allowClose"
      @tabChange="changeTab"
    >
      <div class="name_area">
        <div class="left">
          <span class="label">监控页面</span>
          <el-input v-model="item.title" style="width: 300px"></el-input>
          <el-input v-model="item.url" style="width: 400px;margin-left:20px;" placeholder="请输入监听网络的url"></el-input>
          <el-button class="ml32" type="primary" @click="handleSave">保存名称</el-button>
        </div>

        <el-popover
          :width="300"
          popper-style="box-shadow: rgb(14 18 22 / 35%) 0px 10px 38px -10px, rgb(14 18 22 / 20%) 0px 10px 20px -15px; padding: 20px;"
        >
          <template #reference>
            <el-icon :size="22">
              <HelpFilled />
            </el-icon>
          </template>
          <template #default>
            <div>
              <p>要求修改完名称后，点击一次“保存名称”</p>
              <p>id监听一个目标对象</p>
              <p>class监听一群目标对象</p>
              <p>文本内容监听头部匹配命中的对象</p>
              <p>xuyangyang2@cmict.com</p>
            </div>
          </template>
        </el-popover>
      </div>
      <PageConfig
        class="ex_container"
        :pageId="item.id"
        :customId="item.customId"
        :title="item.title"
        :content="item.content"
      />
    </el-tab-pane>
  </el-tabs>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import type { TabPaneName } from 'element-plus'
import { ElInput, ElTabs, ElTabPane } from 'element-plus'
import { getPageList, putPage, addPage } from '../db/dbUtils'
import PageConfig from '../components/PageConfig.vue'

let tabIndex = 1
const activeTab = ref(null)
const editableTabs = ref([
  {
    id: 0,
    customId: '1',
    title: 'Tab 1',
    content: 'Tab 1 content',
    url: 'https://yzh.zszwfw.cn/zs/l-screen/zt/dpzt/service'
  }
])
const allowClose = computed(() => editableTabs.value.length > 1)
onMounted(async () => {
  let pageList = await initPageList()
  if(pageList.length === 0) {
    return
  }
  activeTab.value = pageList[0].customId
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
      content: '监测页面名称',
      url:''
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

const changeTab = (tab: any) => {
  console.log(tab)
  //
}
</script>

<style lang="less">
.demo-tabs > .el-tabs__content {
  width: 100%;
  height: 100%;
  padding: 0px 8px;
  .el-tab-pane {
    width: 100%;
    height: calc(100% - 60px);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    .name_area {
      padding: 0px 0px 14px 0px;
      border-bottom: 1px solid #dbd3d3;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      .left {
        width: 80%;

        .label {
          margin-right: 10px;
        }
        .ml32 {
          margin-left: 32px;
        }
      }
    }

    .ex_container {
      flex: 1;
    }
  }
}
</style>

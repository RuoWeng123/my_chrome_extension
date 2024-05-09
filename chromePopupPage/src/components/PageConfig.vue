<template>
  <div class="listen_fields">
    <div class="content">
      <ConfigIds class="listen_ids" :ids="config.ids" @change="onChangeIds" />
      <ConfigClasses class="listen_classes" :classList="config.classes" @change="onChangeClasses" />
      <config-keywords
        class="listen_keywords"
        :keywords="config.keywords"
        @change="onChangeKeywords"
      />
    </div>
    <div class="action">
      <el-button class="ml32" type="primary" @click="onSaveConfig">保存配置</el-button>
    </div>
  </div>
</template>
<script>
import { watchEffect, ref } from 'vue'
import { getConfigByPageId, putConfig, addConfig } from '../db/dbUtils'
import ConfigIds from './ConfigIds.vue'
import ConfigClasses from './ConfigClasses.vue'
import ConfigKeywords from './ConfigKeywords.vue'
export default {
  props: ['customId', 'pageId', 'title', 'content'],
  components: {
    ConfigIds,
    ConfigClasses,
    ConfigKeywords
  },
  setup(props) {
    const config = ref({ ids: [], classes: [], keywords: [] })
    const initConfigData = () => {
      config.value = {
        ids: [],
        classes: [],
        keywords: []
      }
    }
    const getConfigData = async () => {
      if (!props.pageId) {
        initConfigData()
        return
      }
      config.value = await getConfigByPageId(props.pageId)
    }
    const onSaveConfig = () => {
      // save config data
      console.log('save config data:', config.value)
      let confitParams = {
        id: config.value.id ? config.value.id : undefined,
        pageId: props.pageId,
        ids: config.value.ids,
        classes: config.value.classes,
        keywords: config.value.keywords,
        createdAt: config.value.createdAt ? config.value.createdAt : new Date().getTime(),
        updatedAt: new Date().getTime()
      }
      if (config.value.id) {
        putConfig(confitParams)
      } else {
        addConfig(confitParams)
      }
    }

    const onChangeIds = (ids) => {
      if (ids instanceof Event) {
        return
      }
      config.value.ids = ids
    }
    const onChangeClasses = (classes) => {
      if (classes instanceof Event) {
        return
      }
      config.value.classes = classes
    }
    const onChangeKeywords = (keywords) => {
      if (keywords instanceof Event) {
        return
      }
      config.value.keywords = keywords
    }
    // watch customId or  id change; getConfigData
    watchEffect(props.customId, (newValue, oldValue) => {
      if (newValue === oldValue) {
        return
      } else {
        getConfigData()
      }
    })
    return {
      config,
      getConfigData,
      onSaveConfig,
      onChangeIds,
      onChangeKeywords,
      onChangeClasses
    }
  }
}
</script>
<style lang="less" scoped>
.listen_fields {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  .content {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;

    .listen_ids {
      width: 30%;
      height: 100%;
    }
    .listen_classes {
      width: 30%;
      height: 100%;
    }
    .listen_keywords {
      width: 40%;
      height: 100%;
    }
  }
  .action {
    width: 100%;
    height: 50px;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    border-top: 1px solid #dbd3d3;
  }
}
</style>
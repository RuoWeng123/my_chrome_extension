<template>
  <div class="ids">
    <div class="top_list">
      <div v-if="currentIds.length > 0">
        <div v-for="(item, index) in currentIds" :key="index" class="item_id">
          <el-input v-model="currentIds[index]" placeholder="输入id" />
          <el-button type="warning" class="ml14" @click="deleteItem(index)">
            <el-icon>
              <Delete />
            </el-icon>
          </el-button>
        </div>
      </div>
      <div v-else class="empty">
        通过id监听，适用于独立元素
        <br />暂无数据请点击底部按钮添加
      </div>
    </div>
    <div class="bottom_action">
      <el-button class="add_button" type="primary" @click="onAdd">
        <el-icon>
          <Plus />
        </el-icon>
      </el-button>
    </div>
  </div>
</template>

<script>
import { reactive, watch, toRaw } from 'vue'
import { ElInput, ElButton, ElIcon } from 'element-plus'

export default {
  name: 'ConfigIds',
  props: ['ids'],
  setup(props, { emit }) {
    const currentIds = reactive(props.ids)
    const deleteItem = (index) => {
      currentIds.splice(index, 1)
    }
    const onAdd = () => {
      currentIds.push('')
    }

    watch(currentIds, (newValue, oldValue) => {
      let pushData = toRaw(newValue)
      let oldData = toRaw(oldValue)
      if (Array.isArray(pushData)){
        emit('change', pushData)
      }
    })
    return {
      currentIds,
      deleteItem,
      onAdd
    }
  }
}
</script>

<style lang="less">
.ids {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 10px;
  padding-right: 10px;

  .top_list {
    min-height: 100px;
    max-height: 100%;
    .item_id {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 6px 6px;
    }

    .ml14 {
      margin-left: 14px;
    }

    .empty {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 14px;
      text-align: center;
    }
  }
  .bottom_action {
    margin-top: 14px;
    width: 100%;
    display: flex;
    justify-content: center;

    .add_button {
      width: 120px;
    }
  }
}
</style>
<template>
  <div class="ids">
    <div class="top_list">
      <div v-if="currentClassList.length > 0">
        <div v-for="(item, index) in currentClassList" :key="index" class="item_id">
          <el-input v-model="currentClassList[index]" placeholder="输入class" />
          <el-button type="warning" class="ml14" @click="deleteItem(index)">
            <el-icon>
              <Delete />
            </el-icon>
          </el-button>
        </div>
      </div>
      <div v-else class="empty">
        通过class监听，适用于重复渲染
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
  name: 'ConfigClasses',
  props: ['classList'],
  setup(props, { emit }) {
    const currentClassList = reactive([...props.classList])

    const deleteItem = (index) => {
      currentClassList.splice(index, 1)
    }
    const onAdd = () => {
      currentClassList.push('')
    }
      // 监听 currentIds 的变化，触发 change 事件
    watch(currentClassList, (newValue, oldValue) => {
      emit('change', newValue)
    })

     watch(
      () => props.classList,
      (newClasses) => {
        currentClassList.splice(0, currentClassList.length, ...newClasses)
      },
      { immediate: true }
    )
    return {
      currentClassList,
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
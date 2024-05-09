<script setup>
import Header from './components/Header.vue'
</script>

<template>
  <div class="app_body">
    <Header class="ex_header"/>
  </div>
</template>

<style lang="less" scoped>
.app_body {
  width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: auto;

  .ex_header {
    width: 100%;
    height: 100vh;
  }
}
</style>

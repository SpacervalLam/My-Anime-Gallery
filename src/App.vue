<template>
  <div class="h-screen flex items-center justify-center bg-transparent">
    <BookFlip />
  </div>
</template>

<script setup>
import BookFlip from './components/BookFlip.vue';
</script>

<style>
/* 确保全局背景透明 */
html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>

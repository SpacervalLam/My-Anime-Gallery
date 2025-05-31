<template>
  <div class="app-container" :class="{'dark': isDarkMode}">
    <!-- 右上角悬停菜单 -->
    <div class="theme-menu-trigger" @mouseenter="startShowMenuTimer" @mouseleave="cancelShowMenuTimer">
      <div class="theme-menu" :class="{visible: showMenu}">
        <button class="theme-toggle" @click="toggleTheme">
          {{ isDarkMode ? '浅色模式' : '深色模式' }}
        </button>
      </div>
    </div>

    <div class="main-content">
      <BookFlip />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import BookFlip from './components/BookFlip.vue';

const isDarkMode = ref(false);
provide('isDarkMode', isDarkMode);

const showMenu = ref(false);
let menuTimer = null;

// 主题切换
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
  localStorage.setItem('darkMode', isDarkMode.value);
};

// 悬停菜单控制
const startShowMenuTimer = () => {
  menuTimer = setTimeout(() => {
    showMenu.value = true;
  }, 10);
};

const cancelShowMenuTimer = () => {
  clearTimeout(menuTimer);
  menuTimer = null;
  showMenu.value = false;
};

// 初始化主题
onMounted(() => {
  const savedMode = localStorage.getItem('darkMode') === 'true';
  isDarkMode.value = savedMode;
  document.documentElement.classList.toggle('dark', savedMode);
});
</script>

<style>
/* 全局样式 */
html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* 主题菜单样式 */
.theme-menu-trigger {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 80px;
  height: 80px;
  z-index: 100;
}

.theme-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.2s ease;
  pointer-events: none;
}

.theme-menu.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.theme-toggle {
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.theme-toggle:hover {
  background: #f3f4f6;
}

/* 深色模式样式 */
.dark .theme-menu {
  background: #1e293b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .theme-toggle {
  color: white;
}

.dark .theme-toggle:hover {
  background: #334155;
}
</style>

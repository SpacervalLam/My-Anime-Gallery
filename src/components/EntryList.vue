<template>
  <div class="max-w-4xl mx-auto mt-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Gallery</h2>
      <button @click="openForm"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
            clip-rule="evenodd" />
        </svg>
        添加新条目
      </button>
    </div>

    <!-- 标签筛选导航 -->
    <div class="mb-6">
      <div class="flex items-center flex-wrap gap-2">
        <span class="text-sm font-medium mr-2">标签筛选:</span>
        <button @click="selectAll"
          :class="{ 'bg-indigo-600 text-white': selectedTags.length === 0, 'bg-gray-200': selectedTags.length > 0 }"
          class="px-3 py-1 rounded-lg text-sm transition">
          全部
        </button>
        <button v-for="tag in allTags" :key="tag" @click="toggleTag(tag)" :class="{
          'bg-indigo-600 text-white': selectedTags.includes(tag),
          'bg-gray-100': !selectedTags.includes(tag)
        }" class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition">
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="entries.length === 0" class="bg-white rounded-xl shadow-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="text-xl font-semibold text-gray-700 mb-2">暂无收藏条目</h3>
      <p class="text-gray-500 mb-6">点击下方按钮添加您的第一条收藏</p>
      <button @click="openForm"
        class="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
            clip-rule="evenodd" />
        </svg>
        添加新条目
      </button>
    </div>

    <!-- 条目列表 -->
    <div v-else class="grid grid-cols-1 gap-6 scroll-container" style="max-height: 70vh; padding-bottom: 1px">
      <div v-for="item in filteredEntries()" :key="item.id" class="relative overflow-hidden">
        <div class="swipe-container"
          :data-swipe-id="item.id"
          @pointerdown="handleStart($event, item.id)"
          @pointermove="handleMove($event, item.id)"
          @pointerup="handleEnd(item.id)"
          @pointercancel="handleEnd(item.id)"
          :style="{ transform: `translateX(${swipePositions[item.id] || 0}px)` }">
          <div
            class="bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl hover:scale-[1.01] ring-2 ring-gray-200 ring-inset shadow-inner">
            <div class="flex flex-col md:flex-row">
              <!-- 封面图片 -->
              <div class="w-full md:w-1/3 aspect-[16/9] bg-gray-100">
                <img :src="`file://${item.coverPath}`" alt="封面" class="w-full h-full object-cover" />
              </div>
              <!-- 内容区域 -->
              <div class="flex-1 p-4 flex flex-col">
                <h3 class="text-xl font-semibold mb-2">{{ item.title }}</h3>
                <!-- 标签展示 -->
                <div class="mb-3 min-h-[24px]">
                  <div v-if="item.tags && JSON.parse(item.tags).length"
                    class="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide py-1">
                    <span v-for="(tag, idx) in JSON.parse(item.tags)" :key="idx"
                      class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs inline-flex shadow-sm hover:shadow-md transition duration-200">
                      {{ tag }}
                    </span>
                  </div>
                  <div v-else class="h-[24px]"></div>
                </div>
                <!-- 链接展示 -->
                <div v-if="item.links && JSON.parse(item.links).length" class="space-y-1">
                  <div v-for="(link, idx) in JSON.parse(item.links)" :key="idx"
                    class="text-sm text-blue-600 truncate hover:underline">
                    <a :href="link.url" target="_blank">{{ link.name || '链接' }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 操作按钮 -->
          <div class="absolute top-0 right-[-96px] h-full w-24 flex flex-col justify-center gap-2 pr-2">
            <button @click.stop="edit(item)"
              class="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              编辑
            </button>
            <button @click.stop="remove(item.id)"
              class="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const entries = ref([]);
const allTags = ref([]);
const selectedTags = ref([]);
const swipePositions = ref({});
const startX = ref(0);
const isDragging = ref(false);
const currentDragId = ref(null);

// 点击外围时，只关闭当前打开的那一项
function handleClickOutside(e) {
  const openId = Object.keys(swipePositions.value).find(id => swipePositions.value[id] !== 0);
  if (!openId) return;
  const openEl = document.querySelector(`.swipe-container[data-swipe-id="${openId}"]`);
  if (openEl && !openEl.contains(e.target)) {
    swipePositions.value[openId] = 0;
  }
}

function handleStart(e, id) {
  e.preventDefault();
  // 先关闭其他打开项
  Object.keys(swipePositions.value).forEach(key => {
    if (key !== String(id)) swipePositions.value[key] = 0;
  });
  // 准备拖拽
  startX.value = e.clientX;
  isDragging.value = true;
  currentDragId.value = id;
  e.currentTarget.setPointerCapture(e.pointerId);
  e.currentTarget.classList.add('active-drag');
}

function handleMove(e, id) {
  if (!isDragging.value || currentDragId.value !== id) return;
  const diff = e.clientX - startX.value;
  swipePositions.value[id] = Math.min(Math.max(diff, -80), 0);
}

function handleEnd(id) {
  if (!isDragging.value || currentDragId.value !== id) return;
  isDragging.value = false;
  currentDragId.value = null;
  const el = document.querySelector('.swipe-container.active-drag');
  el?.classList.remove('active-drag');
  const pos = swipePositions.value[id];
  swipePositions.value[id] = pos < -40 ? -80 : 0;
}

async function load() {
  entries.value = await window.electronAPI.getEntries();
  allTags.value = await window.electronAPI.getAllTags();
  window.dispatchEvent(new Event('tags-updated'));
}

function toggleTag(tag) {
  const idx = selectedTags.value.indexOf(tag);
  if (idx === -1) selectedTags.value.push(tag);
  else selectedTags.value.splice(idx, 1);
}

function selectAll() {
  selectedTags.value = [];
}

function filteredEntries() {
  if (!selectedTags.value.length) return entries.value;
  return entries.value.filter(e => {
    const tags = e.tags ? JSON.parse(e.tags) : [];
    return selectedTags.value.every(t => tags.includes(t));
  });
}

onMounted(() => {
  load();
  window.addEventListener('entry-saved', load);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

async function remove(id) {
  await window.electronAPI.deleteEntry(id);
  load();
}

function edit(item) {
  window.dispatchEvent(new CustomEvent('edit-entry', { detail: item }));
}

function openForm() {
  window.dispatchEvent(new CustomEvent('open-form'));
}
</script>

<style scoped>
.scroll-container {
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  padding-bottom: 1px;
}
.scroll-container::-webkit-scrollbar { display: none !important; }
.scroll-container > * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.scroll-container > *::-webkit-scrollbar { display: none !important; }

.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-hide::-webkit-scrollbar { display: none; }

.swipe-container {
  position: relative;
  width: 100%;
  user-select: none;
  touch-action: none;
  transition: transform 0.3s ease;
}
.swipe-container.active-drag {
  transition: none;
}
</style>

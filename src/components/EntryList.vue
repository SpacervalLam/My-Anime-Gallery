<template>
  <div class="gallery-container">
    <!-- 头部区域 -->
    <div class="gallery-header">
      <div class="header-content">
        <h2 class="gallery-title">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z">
            </path>
          </svg>
          我的收藏库
        </h2>

        <div class="header-actions">
          <!-- 视图切换按钮 -->
          <button @click="toggleView" class="view-toggle" :title="isCompactView ? '切换到大视图' : '切换到小视图'">
            <svg v-if="isCompactView" class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H10V12H4V6Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M14 6H20V12H14V6Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M4 14H10V20H4V14Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M14 14H20V20H14V14Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <svg v-else class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H10V10H4V4Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M14 4H20V10H14V4Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M4 14H10V20H4V14Z" stroke="currentColor" stroke-width="1.5" />
              <path d="M14 14H20V20H14V14Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>

          <button @click="openForm" class="add-button">
            <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
            添加新条目
          </button>
        </div>
      </div>
    </div>

    <!-- 标签筛选导航 -->
    <div class="tags-filter">
      <div class="filter-header" @click="isTagsExpanded = !isTagsExpanded">
        <svg class="filter-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="filter-info">
          <span class="filter-text">标签筛选</span>
          <span class="filter-status">{{ isTagsExpanded ? '点击收起' : '点击展开' }}</span>
        </div>
      </div>

      <transition name="slide-fade">
        <div class="tags-container" v-show="isTagsExpanded">
          <button @click="selectAll" :class="['tag-button', { active: selectedTags.length === 0 }]">
            全部
          </button>
          <button v-for="tag in allTags" :key="tag" @click="toggleTag(tag)"
            :class="['tag-button', { active: selectedTags.includes(tag) }]">
            {{ tag }}
          </button>
        </div>
      </transition>

      <div class="selected-tags" v-if="selectedTags.length > 0 && !isTagsExpanded">
        <span class="selected-label">已选:</span>
        <div class="selected-container">
          <span v-for="tag in selectedTags" :key="tag" class="selected-tag">
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="entries.length === 0" class="empty-state">
      <div class="empty-content">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 10V8H6V10H8ZM8 14V12H6V14H8ZM14 10V8H12V10H14ZM14 14V12H12V14H14ZM20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6Z"
            stroke="currentColor" stroke-width="1.5" />
          <path d="M8 10V8H6V10H8ZM8 14V12H6V14H8ZM14 10V8H12V10H14ZM14 14V12H12V14H14Z" stroke="currentColor"
            stroke-width="1.5" />
        </svg>
        <h3 class="empty-title">暂无收藏条目</h3>
        <p class="empty-text">点击下方按钮添加您的第一条收藏</p>
        <button @click="openForm" class="empty-button">
          <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          添加新条目
        </button>
      </div>
    </div>

    <!-- 条目列表 -->
    <div v-else class="entries-container" :class="{ 'compact-view': isCompactView }">
      <div v-for="item in filteredEntries()" :key="item.id" class="swipe-container"
        @pointerdown="handleStart($event, item.id)" @pointermove="handleMove($event, item.id)"
        @pointerup="handleEnd(item.id)" @pointercancel="handleEnd(item.id)">

        <!-- 滑动内容 -->
        <div class="swipe-content" :style="{ transform: `translateX(${swipePositions[item.id] || 0}px)` }">
          <div class="entry-card">
            <div class="entry-content">
              <!-- 封面图片 -->
              <div class="cover-container" :class="{ 'compact': isCompactView }">
                <img :src="`file://${item.coverPath}`" alt="封面" class="cover-image"
                  v-if="item.coverPath && item.coverPath !== ''" />
                <div class="cover-placeholder" v-else>
                  <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M4 16L8.5 10.5L11 13.5L14.5 9L16 11L20 7V16C20 18.2091 18.2091 20 16 20H8C5.79086 20 4 18.2091 4 16V16Z"
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M4 16V7C4 4.79086 5.79086 3 8 3H16C18.2091 3 20 4.79086 20 7V7" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                </div>
              </div>

              <!-- 内容区域 -->
              <div class="info-container">
                <h3 class="entry-title">{{ item.title }}</h3>

                <!-- 标签展示 -->
                <div class="tags-container">
                  <span v-for="(tag, idx) in item.tags ? JSON.parse(item.tags) : []" :key="idx" class="tag" :style="{
                    backgroundColor: getRandomLightColor(tag),
                    color: '#333' 
                  }">
                    {{ tag }}
                  </span>
                  <span v-if="!item.tags || JSON.parse(item.tags).length === 0" class="no-tags">
                    无标签
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button @click.stop="edit(item)" class="action-button edit-button">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            编辑
          </button>
          <button @click.stop="remove(item.id)" class="action-button delete-button">
            <svg class="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
              <path
                d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M10 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
              <path d="M14 11V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 声明会向父组件抛出的事件
const emit = defineEmits(['result-click']);

const isCompactView = ref(false); // 添加视图状态
const startTime = ref(0);
const MAX_CLICK_TIME = 150;    // ms
const MAX_CLICK_DISTANCE = 3;  // px

// 切换视图函数
function toggleView() {
  isCompactView.value = !isCompactView.value;
}

const entries = ref([]);
const allTags = ref([]);
const selectedTags = ref([]);
const swipePositions = ref({});
const startX = ref(0);
const isDragging = ref(false);
const currentDragId = ref(null);
const openCardId = ref(null);
const fixedStates = ref({});
const isTagsExpanded = ref(false); // 默认折叠标签区域
const tagColors = ref({});

function getRandomLightColor(tag) {
  if (!tagColors.value[tag]) {
    const hue = Math.floor(Math.random() * 360);
    tagColors.value[tag] = `hsl(${hue}, 60%, 85%)`; // 饱和度 60%，亮度 85%
  }
  return tagColors.value[tag];
}

function handleStart(e, id) {
  e.preventDefault();

  if (openCardId.value && openCardId.value !== id) {
    swipePositions.value[openCardId.value] = 0;
    fixedStates.value[openCardId.value] = false;
    openCardId.value = null;
  }

  startX.value = e.clientX;
  startTime.value = Date.now(); // 记录按下时刻
  isDragging.value = false; // 初始设为false
  currentDragId.value = id;
}

function handleMove(e, id) {
  if (fixedStates.value[id]) {
    e.preventDefault();
    return;
  }

  if (currentDragId.value !== id) return;

  const deltaX = e.clientX - startX.value;
  if (Math.abs(deltaX) > MAX_CLICK_DISTANCE) {
    isDragging.value = true;
  }

  if (isDragging.value) {
    const limited = Math.min(Math.max(deltaX, -140), 0);
    swipePositions.value[id] = limited;
  }
}

function handleEnd(id) {
  const duration = Date.now() - startTime.value;
  const pos = swipePositions.value[id] || 0;

  // 快速点击判断
  if (!isDragging.value
    && duration <= MAX_CLICK_TIME
    && Math.abs(pos) <= MAX_CLICK_DISTANCE
    && currentDragId.value === id) {
    emit('result-click', id);
    swipePositions.value[id] = 0;
    isDragging.value = false;
    currentDragId.value = null;
    return;
  }

  // 拖拽处理
  if (isDragging.value && currentDragId.value === id) {
    const threshold = -100;
    if (pos < threshold) {
      swipePositions.value[id] = -115;
      fixedStates.value[id] = true;
      openCardId.value = id;
    } else {
      swipePositions.value[id] = 0;
      fixedStates.value[id] = false;
      openCardId.value = null;
    }
  } else {
    swipePositions.value[id] = 0;
    fixedStates.value[id] = false;
    openCardId.value = null;
  }

  isDragging.value = false;
  currentDragId.value = null;
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
  // 把要编辑的 entry 详情丢给表单
  console.log('[EntryList] dispatch start-edit-entry', item.id);
  window.dispatchEvent(new CustomEvent('start-edit-entry', { detail: item }));
}

function openForm() {
  window.dispatchEvent(new CustomEvent('open-form', { detail: { isNew: true } }));
}

function handleClickOutside(e) {
  if (openCardId.value === null) return;
  const openEl = document.querySelector(`.swipe-container[data-id="${openCardId.value}"]`);
  if (openEl && !openEl.contains(e.target)) {
    swipePositions.value[openCardId.value] = 0;
    fixedStates.value[openCardId.value] = false;
    openCardId.value = null;
  }
}
</script>

<style scoped>
/* 添加头部操作区域样式 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-toggle {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.view-toggle:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.view-toggle .icon {
  width: 20px;
  height: 20px;
}

.cover-container {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  aspect-ratio: 2 / 1;
  width: 100%;
}

.cover-container.compact {
  aspect-ratio: 2 / 1;
}

.cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #9ca3af;
}

.placeholder-icon {
  width: 50px;
  height: 50px;
}

/* 紧凑视图样式 */
.entries-container.compact-view {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.compact-view .swipe-container {
  border-radius: 12px;
  height: 240px;
}

.compact-view .entry-title {
  font-size: 0.95rem;
  -webkit-line-clamp: 2;
  margin-bottom: 6px;
}

.compact-view .tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
}

.compact-view .no-tags {
  font-size: 0.75rem;
}

.compact-view .action-buttons {
  width: 100px;
}

.compact-view .action-button {
  padding: 6px 8px;
  font-size: 0.8rem;
}

.compact-view .button-icon {
  width: 16px;
  height: 16px;
}

/* 添加过渡效果 */
.swipe-container,
.cover-container,
.entry-title,
.tag,
.action-button,
.button-icon {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gallery-container {
  padding: 15px;
  max-width: 1200px;
  margin: 0 auto;
}

.gallery-container * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 禁止图片拖拽 */
.gallery-container img {
  -webkit-user-drag: none;
  user-drag: none;
}

.gallery-header {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 14px;
  margin-bottom: 20px;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.gallery-title {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.icon {
  width: 24px;
  height: 24px;
}

.add-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.add-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.tags-filter {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.filter-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 0;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.filter-text {
  font-weight: 600;
  color: #4b5563;
  font-size: 0.95rem;
}

.filter-status {
  color: #6366f1;
  font-size: 0.85rem;
  background: #eef2ff;
  padding: 3px 8px;
  border-radius: 8px;
}

.filter-icon {
  width: 22px;
  height: 22px;
  color: #4b5563;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.tag-button {
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 18px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tag-button.active {
  background: #6366f1;
  color: white;
}

.selected-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.selected-label {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.selected-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.selected-tag {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.empty-state {
  background: white;
  border-radius: 14px;
  padding: 30px 16px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.empty-content {
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon {
  width: 70px;
  height: 70px;
  color: #9ca3af;
  margin: 0 auto 16px;
}

.empty-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.empty-text {
  color: #6b7280;
  margin-bottom: 20px;
  font-size: 0.95rem;
}

.empty-button {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.empty-button:hover {
  background: #4f46e5;
  transform: translateY(-2px);
}

.entries-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.swipe-container {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  height: 100%;
  background: #f9fafb;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.swipe-content {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 14px;
  transition: transform 0.3s ease;
  height: 100%;
}

/* 动画：鼠标悬停和点击时，卡片轻微浮起、缩放和阴影变化 */
.entry-card {
  height: 100%;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.entry-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.entry-card:active {
  transform: translateY(-2px) scale(0.98);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.entry-content {
  display: flex;
  flex-direction: column;
  padding: 14px;
  height: 100%;
}

.info-container {
  flex: 1;
}

.entry-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 26px;
}

.tag {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 3px 10px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
}

.no-tags {
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
}

/* 操作按钮 */
.action-buttons {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 110px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 0 14px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  z-index: 1;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  font-size: 0.85rem;
}

.edit-button {
  background: #e0f2fe;
  color: #0ea5e9;
}

.edit-button:hover {
  background: #bae6fd;
  transform: translateY(-2px);
}

.delete-button {
  background: #fee2e2;
  color: #ef4444;
}

.delete-button:hover {
  background: #fecaca;
  transform: translateY(-2px);
}

.button-icon {
  width: 18px;
  height: 18px;
}

.swipe-hint {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 14px;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 0.85rem;
  border-radius: 14px;
  z-index: 0;
  opacity: 0;
  animation: fadeHint 3s infinite;
  pointer-events: none;
  width: 110px;
}

@keyframes fadeHint {

  0%,
  100% {
    opacity: 0;
  }

  20%,
  80% {
    opacity: 1;
  }
}

.hint-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}

/* 标签筛选动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .entries-container {
    grid-template-columns: 1fr;
  }

  .gallery-title {
    font-size: 1.3rem;
  }

  .add-button {
    width: 100%;
    justify-content: center;
  }

  .tags-container {
    gap: 6px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

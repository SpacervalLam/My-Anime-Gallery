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
        <button @click="openForm" class="add-button">
          <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V18M18 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          添加新条目
        </button>
      </div>
    </div>

    <!-- 标签筛选导航 -->
    <div class="tags-filter">
      <svg class="filter-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" @click="isTagsExpanded = !isTagsExpanded">
        <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <div class="tags-container" v-show="isTagsExpanded">
        <button @click="selectAll" :class="['tag-button', { active: selectedTags.length === 0 }]">
          全部
        </button>
        <button v-for="tag in allTags" :key="tag" @click="toggleTag(tag)"
          :class="['tag-button', { active: selectedTags.includes(tag) }]">
          {{ tag }}
        </button>
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

    <!-- 条目列表 - 使用新的滑动容器 -->
    <div v-else class="entries-container">
      <div v-for="item in filteredEntries()" :key="item.id" class="swipe-container"
        @pointerdown="handleStart($event, item.id)" @pointermove="handleMove($event, item.id)"
        @pointerup="handleEnd(item.id)" @pointercancel="handleEnd(item.id)">

        <!-- 滑动内容 -->
        <div class="swipe-content" :style="{ transform: `translateX(${swipePositions[item.id] || 0}px)` }"
          @click="handleContentClick(item.id)">
          <div class="entry-card">
            <div class="entry-content">
              <!-- 封面图片 -->
              <div class="cover-container">
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
                  <span v-for="(tag, idx) in item.tags ? JSON.parse(item.tags) : []" :key="idx" class="tag">
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

        <!-- 操作按钮 - 固定在右侧 -->
        <div class="action-buttons">
          <button @click="edit(item)" class="action-button edit-button">
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
          <button @click="remove(item.id)" class="action-button delete-button">
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

        <div class="swipe-hint" v-if="!swipePositions[item.id] || swipePositions[item.id] >= 0">
          <svg class="hint-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 5L21 12M21 12L14 19M21 12H3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
          左滑操作
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
const openCardId = ref(null); // 跟踪当前打开的卡片
const fixedStates = ref({}); // 跟踪固定状态的卡片
const isTagsExpanded = ref(true); // 控制标签筛选模块展开状态

// 处理内容点击 - 点击滑块内容时复位
// function handleContentClick(id) {
//   if (swipePositions.value[id] < 0) {
//     swipePositions.value[id] = 0;
//     fixedStates.value[id] = false;
//     openCardId.value = null;
//   }
// }

// 处理外部点击
function handleClickOutside(e) {
  if (openCardId.value === null) return;
  const openEl = document.querySelector(`.swipe-container[data-id="${openCardId.value}"]`);
  // 如果点击的不是当前打开的条目，则复位
  if (openEl && !openEl.contains(e.target)) {
    swipePositions.value[openCardId.value] = 0;
    fixedStates.value[openCardId.value] = false;
    openCardId.value = null;
  }
}

function handleStart(e, id) {
  e.preventDefault();

  // 关闭其他打开的卡片
  if (openCardId.value && openCardId.value !== id) {
    swipePositions.value[openCardId.value] = 0;
    fixedStates.value[openCardId.value] = false;
    openCardId.value = null;
  }

  startX.value = e.clientX;
  isDragging.value = true;
  currentDragId.value = id;
}

function handleMove(e, id) {
  // 如果卡片已固定，完全阻止拖动
  if (fixedStates.value[id]) {
    e.preventDefault();
    return;
  }

  if (!isDragging.value || currentDragId.value !== id) return;

  const diff = e.clientX - startX.value;
  // 限制只能向左滑动
  swipePositions.value[id] = Math.min(Math.max(diff, -140), 0);
}

function handleEnd(id) {
  if (!isDragging.value || currentDragId.value !== id) return;

  isDragging.value = false;
  currentDragId.value = null;

  const pos = swipePositions.value[id];
  const threshold = -100;

  if (pos < threshold) {
    // 超过阈值，回弹到-115
    swipePositions.value[id] = -115;
    fixedStates.value[id] = false;
    openCardId.value = null;
  } else {
    // 未达阈值，回弹到0
    swipePositions.value[id] = 0;
    fixedStates.value[id] = false;
    openCardId.value = null;
  }
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
  // 编辑前复位卡片
  swipePositions.value[item.id] = 0;
  openCardId.value = null;

  window.dispatchEvent(new CustomEvent('edit-entry', { detail: item }));
}

function openForm() {
  window.dispatchEvent(new CustomEvent('open-form'));
}
</script>

<style scoped>
.gallery-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.gallery-header {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}

.gallery-title {
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.icon {
  width: 28px;
  height: 28px;
}

.add-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.add-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
}

.tags-filter {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}



.filter-icon {
  width: 24px;
  height: 24px;
  color: #4b5563;
  margin-right: 16px;
}



.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.tag-button {
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.2;
  vertical-align: middle;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tag-button.active {
  background: #6366f1;
  color: white;
}

.empty-state {
  background: white;
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.empty-content {
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #9ca3af;
  margin: 0 auto 20px;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.empty-text {
  color: #6b7280;
  margin-bottom: 24px;
}

.empty-button {
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.empty-button:hover {
  background: #4f46e5;
  transform: translateY(-2px);
}

.entries-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* 新的滑动容器 */
.swipe-container {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  height: 100%;
  background: #f9fafb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.swipe-content {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 16px;
  transition: transform 0.3s ease;
  height: 100%;
}

.entry-card {
  height: 100%;
}

.entry-content {
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
}

.cover-container {
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  position: relative;
}

.cover-image {
  width: 100%;
  aspect-ratio: 2 / 1; /* 宽:高 = 2:1，高度就是宽度的一半 */
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
  width: 60px;
  height: 60px;
}

.info-container {
  flex: 1;
}

.entry-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 30px;
}

.tag {
  background: #e0e7ff;
  color: #4f46e5;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.no-tags {
  color: #9ca3af;
  font-size: 0.9rem;
  font-style: italic;
}

.links-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.link-icon {
  width: 16px;
  height: 16px;
  color: #4f46e5;
  flex-shrink: 0;
}

.link-text {
  color: #4f46e5;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-text:hover {
  text-decoration: underline;
}

.no-links {
  color: #9ca3af;
  font-size: 0.9rem;
  font-style: italic;
}

.action-buttons {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  z-index: 1;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
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
  width: 20px;
  height: 20px;
}

.swipe-hint {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 0.9rem;
  border-radius: 16px;
  z-index: 0;
  opacity: 0;
  animation: fadeHint 3s infinite;
  pointer-events: none;
  width: 120px;
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
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .entries-container {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    width: 100px;
  }
}
</style>

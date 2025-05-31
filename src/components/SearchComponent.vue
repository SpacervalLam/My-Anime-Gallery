<template>
  <div class="search-container">
    <div class="search-wrapper">
      <div class="search-input-container">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input v-model="searchQuery" placeholder="搜索动画标题..." class="search-input" @input="onInput" @keydown="onKeyDown"
          @focus="isFocused = true" @blur="isFocused = false" />
        <div v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <svg class="clear-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
      </div>

      <div v-if="suggestions.length" ref="suggestionListRef" class="suggestion-list"
        :class="{ 'active': isFocused || suggestions.length }">
        <div v-for="(item, index) in suggestions" :key="item.id" class="suggestion-item"
          :class="{ highlighted: index === highlightedIndex }" @click="selectSuggestion(item)">
          <div class="suggestion-image-wrapper">
            <img v-if="item.coverPath" :src="`file://${item.coverPath}`" class="suggestion-image" alt="封面" />
            <div v-else class="suggestion-image placeholder"></div>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-title">{{ item.title }}</div>
            <div v-if="item.altTitles" class="suggestion-alttitles">
              {{ parseAltTitles(item.altTitles) }}
            </div>
            <div v-if="item.tags" class="suggestion-tags">
              <span v-for="(tag, index) in parseTags(item.tags)" :key="index" class="tag">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="searchQuery && !suggestions.length" class="no-results">
        未找到匹配的条目
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';

const emit = defineEmits(['result-click']); // 通知父组件：用户点击了某个建议条目，参数是条目的 id
const searchQuery = ref('');
const entries = ref([]);
const suggestions = ref([]);
const isFocused = ref(false);
const highlightedIndex = ref(-1);
const suggestionListRef = ref(null);

async function loadEntries() {
  entries.value = await window.electronAPI.getEntries();
  if (searchQuery.value) onInput();
}

onMounted(async () => {
  entries.value = await window.electronAPI.getEntries();
  window.addEventListener('entry-saved', loadEntries);
  window.addEventListener('entry-deleted', loadEntries);
});

onUnmounted(() => {
  window.removeEventListener('entry-saved', loadEntries);
  window.removeEventListener('entry-deleted', loadEntries);
});

watch(searchQuery, () => {
  highlightedIndex.value = -1;
});

function parseAltTitles(altTitles) {
  try {
    const titles = JSON.parse(altTitles);
    return titles.slice(0, 2).join(' / ');
  } catch {
    return altTitles;
  }
}

function parseTags(tags) {
  try {
    return JSON.parse(tags).slice(0, 3);
  } catch {
    return [tags];
  }
}

function onInput() {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    suggestions.value = [];
    return;
  }
  suggestions.value = entries.value
    .filter(e => {
      const title = (e.title || '').toLowerCase();
      const alt = e.altTitles ? JSON.parse(e.altTitles) : [];
      return title.includes(q) || alt.some(t => t.toLowerCase().includes(q));
    })
    .slice(0, 10);
}

function selectSuggestion(item) {
  searchQuery.value = item.title;
  suggestions.value = [];
  highlightedIndex.value = -1;
  emit('result-click', item.id); // 将 item.id 通过 result-click 事件抛给父组件，由父组件去跳转到详情页
}

function clearSearch() {
  searchQuery.value = '';
  suggestions.value = [];
  highlightedIndex.value = -1;
}

function onKeyDown(e) {
  const len = suggestions.value.length;
  if (!len) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value + 1) % len;
    scrollToHighlighted();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightedIndex.value = (highlightedIndex.value - 1 + len) % len;
    scrollToHighlighted();
  } else if (e.key === 'Enter') {
    if (highlightedIndex.value >= 0 && highlightedIndex.value < len) {
      selectSuggestion(suggestions.value[highlightedIndex.value]);
    }
  } else if (e.key === 'Tab') {
    if (highlightedIndex.value === -1 && len > 0) {
      highlightedIndex.value = 0;
      scrollToHighlighted();
      e.preventDefault();
    }
  } else if (e.key === 'Escape') {
    suggestions.value = [];
    highlightedIndex.value = -1;
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    const container = suggestionListRef.value;
    const activeItem = container?.querySelector('.suggestion-item.highlighted');
    if (activeItem && container) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  });
}
</script>

<style scoped>
.search-container {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
}

.search-wrapper {
  width: 100%;
  max-width: 800px;
  position: relative;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
  padding: 0.8rem 1.2rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.search-input-container:focus-within {
  box-shadow: 0 10px 40px rgba(92, 107, 192, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  transform: translateY(-2px);
}

.search-icon {
  width: 22px;
  height: 22px;
  color: #6366f1;
  margin-right: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.05rem;
  color: #334155;
  padding: 0.5rem 0;
  outline: none;
  font-weight: 500;
}

.search-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.clear-icon {
  width: 18px;
  height: 18px;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.clear-btn:hover .clear-icon {
  color: #ef4444;
  transform: scale(1.1);
}

.suggestion-list {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  box-shadow: 0 15px 50px rgba(31, 38, 135, 0.15);
  overflow: hidden;
  z-index: 100;
  max-height: 0;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateY(10px);
}

.suggestion-list.active {
  max-height: 500px;
  opacity: 1;
  transform: translateY(0);
}

.suggestion-item {
  display: flex;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.25s ease;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: rgba(241, 245, 249, 0.7);
  transform: translateX(5px);
}

.suggestion-item.highlighted {
  background: rgba(99, 102, 241, 0.1);
  transform: translateX(5px);
}

.suggestion-image-wrapper {
  width: 70px;
  height: 90px;
  flex-shrink: 0;
  margin-right: 16px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.suggestion-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.suggestion-item:hover .suggestion-image {
  transform: scale(1.05);
}

.suggestion-image.placeholder {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.suggestion-image.placeholder::after {
  content: "无封面";
  color: #94a3b8;
  font-size: 0.8rem;
}

.suggestion-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.suggestion-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-alttitles {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: rgba(199, 210, 254, 0.4);
  color: #4f46e5;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.suggestion-item:hover .tag {
  background: rgba(99, 102, 241, 0.15);
  color: #4338ca;
}

.no-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  box-shadow: 0 15px 50px rgba(31, 38, 135, 0.15);
  text-align: center;
  color: #64748b;
  font-weight: 500;
  z-index: 100;
}
</style>

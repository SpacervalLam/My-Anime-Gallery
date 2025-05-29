<template>
  <div class="search-wrapper">
    <div class="search-container">
      <input
        v-model="searchQuery"
        placeholder="搜索标题..."
        class="search-input"
        @input="onInput"
      />
      <div v-if="suggestions.length" class="suggestion-list">
        <div
          v-for="item in suggestions"
          :key="item.id"
          class="suggestion-item"
          @mousedown.prevent="selectSuggestion(item)"
        >
          <div class="suggestion-image-wrapper">
            <img
              v-if="item.coverPath"
              :src="`file://${item.coverPath}`"
              class="suggestion-image"
              alt="封面"
            />
            <div v-else class="suggestion-image placeholder"></div>
          </div>
          <div class="suggestion-title" @click="showEntry(item)">{{ item.title }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
const emit = defineEmits(['result-click']);

const searchQuery = ref('');
const entries = ref([]);
const suggestions = ref([]);

onMounted(async () => {
  entries.value = await window.electronAPI.getEntries();
});

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
    .slice(0, 5);
}

function selectSuggestion(item) {
  searchQuery.value = item.title;
  suggestions.value = [];
  emit('result-click', item);
}

function showEntry(item) {
  emit('result-click', item);
}
</script>

<style scoped>
.search-wrapper {
  position: relative;
  width: 100%;
}
.search-container {
  padding: 20px;
  background: #fff;
  border-bottom: 1px solid #eee;
  position: relative;
}
.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}
.suggestion-list {
  position: absolute;
  top: 100%;
  left: 20px;
  right: 20px;
  margin-top: 5px;
  background: #fff;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}
.suggestion-item {
  display: flex;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.suggestion-item:hover {
  background: #f8f9fa;
  transform: translateY(-1px);
}
.suggestion-image-wrapper {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  margin-right: 10px;
}
.suggestion-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.suggestion-image.placeholder {
  background: #e2e8f0;
  border-radius: 4px;
}
.suggestion-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
</style>

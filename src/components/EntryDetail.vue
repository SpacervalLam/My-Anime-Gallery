<template>
  <div class="entry-detail-page">
    <audio ref="audioEl" loop></audio>

    <!-- 加载中指示 -->
    <div v-if="loading" class="loading-indicator">
      <div class="spinner"></div>
      <span>{{ $t('loading') }}</span>
    </div>

    <!-- 有 entry 时显示内容 -->
    <div v-else-if="entry" class="entry-detail-content">
      <!-- 静音按钮 -->
      <div class="audio-control">
        <button
          @click="toggleMute"
          class="mute-button"
          :class="{ rotating: !isMuted, disabled: !hasMusic }"
          :disabled="!hasMusic"
          :title="hasMusic ? (isMuted ? $t('cancelMute') : $t('mute')) : $t('noMusic')"
        >
          <svg
            v-if="!isMuted"
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m-2.828-9.9a9 9 0 012.728-2.728"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              clip-rule="evenodd"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        </button>
      </div>

      <!-- 封面图片 -->
      <div class="cover-container">
        <img
          :src="entry.coverPath ? `file://${entry.coverPath}` : '/images/placeholder.jpg'"
          class="cover-image"
          :alt="$t('coverImage')"
        />
      </div>

      <!-- 信息区域 -->
      <div class="info-section">
        <div class="title-section">
          <h1 class="main-title">{{ entry.title }}</h1>
          <div v-if="entry.altTitles" class="alt-titles">
            <p class="alt-titles-content">{{ parseAltTitles(entry.altTitles) }}</p>
          </div>
        </div>

        <div v-if="entry.tags" class="tags-section">
          <div class="tags-container">
            <span v-for="(tag, idx) in parseTags(entry.tags)" :key="idx" class="tag">
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 简介 -->
        <div class="description-section">
          <h2 class="section-label">{{ $t('summary') }}</h2>
          <div v-if="entry.description" class="description-content">
            {{ entry.description }}
          </div>
          <div v-else class="placeholder-message">
            {{ $t('summaryMissing') }}
          </div>
        </div>

        <!-- 相关链接 -->
        <div class="links-section">
          <h2 class="section-label">{{ $t('relatedLinks') }}</h2>
          <div v-if="entry.links" class="links-container">
            <div
              v-for="(link, idx) in parseLinks(entry.links)"
              :key="idx"
              class="link"
              @click="handleLinkClick(link.url)"
            >
              <svg
                class="link-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              <span class="link-text">{{ formatLink(link) }}</span>
            </div>
          </div>
          <div v-else class="placeholder-message">
            {{ $t('linksMissing') }}
          </div>
        </div>
      </div>
    </div>

    <!-- 无 entry 时显示占位 -->
    <div v-else class="no-entry">
      <div class="placeholder-box">
        <svg
          class="placeholder-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>{{ $t('entryNotFound') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';

const props = defineProps({
  entryId: {
    type: Number,
    required: true
  }
});

const entry = ref(null);
const loading = ref(false);
const audioEl = ref(null);
const isMuted = ref(false);

// 是否有背景音乐
const hasMusic = computed(() => !!entry.value?.music);

// 解析其他标题（JSON 字符串或直接文本）
const parseAltTitles = (altTitles) => {
  try {
    return JSON.parse(altTitles).join(' / ');
  } catch {
    return altTitles;
  }
};

// 解析标签字段（JSON 数组或逗号分隔等）
const parseTags = (tags) => {
  try {
    const arr = JSON.parse(tags);
    return Array.isArray(arr) ? arr : [tags];
  } catch {
    return [tags];
  }
};

// 解析链接字段，返回 { name, url } 数组
const parseLinks = (links) => {
  try {
    const parsed = JSON.parse(links);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === 'object' && item.url) {
          return { name: item.name || item.url, url: item.url };
        }
        return { name: item, url: item };
      });
    }
    return [{ name: parsed, url: parsed }];
  } catch {
    return [{ name: links, url: links }];
  }
};

// 格式化链接显示为「域名+路径」
const formatLink = (link) => {
  if (typeof link === 'object' && link.name) {
    return link.name;
  }
  try {
    const urlObj = new URL(link.url || link);
    return `${urlObj.hostname}${urlObj.pathname !== '/' ? urlObj.pathname : ''}`;
  } catch {
    return link.url || link;
  }
};

// 判断后缀是否图片
const isImage = (url) => /\.(jpe?g|png|gif|bmp|webp)(\?.*)?$/i.test(url);

// 判断后缀是否视频
const isVideo = (url) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

// 判断后缀是否为 TXT
const isTxt = (url) => url.toLowerCase().endsWith('.txt');

// 判断后缀是否为 Markdown
const isMarkdown = (url) => url.toLowerCase().endsWith('.md');

// 点击链接时处理：图片/视频/EPUB/TXT/Markdown 用 open-media 事件，其他打开外部
const handleLinkClick = (url) => {
  console.log('handleLinkClick，链接是：', url);
  if (isImage(url) || isVideo(url) || isTxt(url) || isMarkdown(url) || url.toLowerCase().endsWith('.epub')) {
    window.dispatchEvent(new CustomEvent('open-media', { detail: url }));
  } else {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      console.error('electronAPI.openExternal 不可用');
    }
  }
};

// 播放背景音乐
const playMusic = () => {
  if (!audioEl.value || !hasMusic.value) return;
  audioEl.value.src = `file://${entry.value.music}`;
  audioEl.value.volume = 0.5;
  audioEl.value.muted = isMuted.value;
  audioEl.value.play().catch((e) => console.error('播放失败', e));
};

// 切换静音/取消静音
const toggleMute = () => {
  if (!hasMusic.value) return;
  isMuted.value = !isMuted.value;
  audioEl.value.muted = isMuted.value;
  if (!audioEl.value.src) {
    playMusic();
  }
};

// 从后台获取条目详情
const fetchEntry = async () => {
  if (!props.entryId) return;
  loading.value = true;
  try {
    if (window.electronAPI?.getEntryById) {
      entry.value = await window.electronAPI.getEntryById(props.entryId);
    } else {
      console.error('electronAPI.getEntryById 未定义');
      entry.value = null;
    }
  } catch (err) {
    console.error('获取条目失败:', err);
    entry.value = null;
  } finally {
    loading.value = false;
  }
};

// 当 props.entryId 变化时重新拉取
watch(() => props.entryId, fetchEntry, { immediate: true });

// 当 entry 加载完且有音乐字段时，开始播放
watch(
  () => entry.value,
  async (newVal) => {
    if (newVal && newVal.music) {
      await nextTick();
      playMusic();
    }
  }
);

onMounted(() => {
  const handleEntrySaved = () => {
    fetchEntry();
  };

  window.addEventListener('entry-saved', handleEntrySaved);

  // 组件卸载时，停止音乐并清空 src
  return () => {
    if (audioEl.value) {
      audioEl.value.pause();
      audioEl.value.src = '';
    }
    window.removeEventListener('entry-saved', handleEntrySaved);
  };
});
</script>

<style scoped>
.entry-detail-page {
  height: 100%;
  overflow-y: auto;
  padding: 15px;
  background: linear-gradient(135deg, #f9f7ff 0%, #e6f3ff 100%);
  box-sizing: border-box;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  user-select: none;
  transition: all 0.3s ease;
}

.dark .entry-detail-page {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.entry-detail-content {
  height: 100%;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.audio-control {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 10;
}

.mute-button {
  background: rgba(255, 255, 255, 0.92);
  border: none;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(123, 97, 255, 0.25);
  transition: all 0.25s ease;
}

.dark .mute-button {
  background: rgba(30, 41, 59, 0.92);
  box-shadow: 0 3px 10px rgba(123, 97, 255, 0.4);
}

.mute-button:hover:not(.disabled) {
  background: white;
  transform: scale(1.08);
  box-shadow: 0 5px 14px rgba(123, 97, 255, 0.35);
}

.dark .mute-button:hover:not(.disabled) {
  background: #1e293b;
  box-shadow: 0 5px 14px rgba(123, 97, 255, 0.5);
}

.mute-button.rotating {
  animation: rotate 4s linear infinite;
}

.mute-button.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.mute-button svg {
  stroke-width: 1.5;
  color: #7b61ff;
  width: 20px;
  height: 20px;
}

/* 封面图片 */
.cover-container {
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12);
  aspect-ratio: 2/1;
}

.dark .cover-container {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
  pointer-events: none;
}

/* 信息区域 */
.info-section {
  background: white;
  border-radius: 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.07);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1 1 auto;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.dark .info-section {
  background: #1e293b;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.title-section {
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  text-align: center;
}

.dark .title-section {
  border-bottom: 1px solid #334155;
}

.main-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.dark .main-title {
  color: #e2e8f0;
}

.alt-titles-content {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.5;
  font-style: italic;
  padding: 0 15px;
  transition: color 0.3s ease;
}

.dark .alt-titles-content {
  color: #94a3b8;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.tag {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 6px 15px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 3px 6px rgba(139, 92, 246, 0.2);
  transition: transform 0.2s;
}

.tag:hover {
  transform: translateY(-2px);
}

.section-label {
  font-size: 1.15rem;
  font-weight: 700;
  color: #7b61ff;
  margin: 0 0 12px 0;
  padding-left: 8px;
  border-left: 3px solid #7b61ff;
}

.description-content {
  font-size: 0.95rem;
  color: #334155;
  line-height: 1.7;
  white-space: pre-line;
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  user-select: text;
  transition: all 0.3s ease;
}

.dark .description-content {
  background: #0f172a;
  color: #e2e8f0;
  border-color: #334155;
}

.links-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
  user-select: text;
}

.dark .link {
  background: #0f172a;
  border-color: #334155;
}

.link:hover {
  background: #eef2ff;
  transform: translateX(5px);
  border-color: #c7d2fe;
}

.dark .link:hover {
  background: #1e293b;
  border-color: #4f46e5;
}

.link-icon {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  color: #7b61ff;
}

.link-text {
  color: #4f46e5;
  font-weight: 600;
  font-size: 0.92rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-grow: 1;
  transition: color 0.3s ease;
}

.dark .link-text {
  color: #818cf8;
}

/* 加载状态 */
.loading-indicator {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 15px;
}

.spinner {
  width: 45px;
  height: 45px;
  border: 3px solid rgba(123, 97, 255, 0.2);
  border-top: 3px solid #7b61ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-indicator span {
  font-size: 1.1rem;
  color: #64748b;
  font-weight: 500;
  transition: color 0.3s ease;
}

.dark .loading-indicator span {
  color: #94a3b8;
}

/* 默认消息样式 */
.placeholder-message {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.98rem;
  font-style: italic;
  border: 1px dashed #cbd5e1;
  transition: all 0.3s ease;
}

.dark .placeholder-message {
  background: #0f172a;
  color: #64748b;
  border-color: #334155;
}

/* 空状态 */
.no-entry {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.placeholder-box {
  text-align: center;
  max-width: 360px;
  padding: 30px;
  background: white;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.07);
  transition: all 0.3s ease;
}

.dark .placeholder-box {
  background: #1e293b;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.placeholder-icon {
  width: 40px;
  height: 40px;
  display: block;
  margin: 0 auto 18px auto;
  color: #cbd5e1;
  transition: color 0.3s ease;
}

.dark .placeholder-icon {
  color: #475569;
}

.placeholder-box p {
  font-size: 1.15rem;
  color: #64748b;
  margin: 0;
  transition: color 0.3s ease;
}

.dark .placeholder-box p {
  color: #94a3b8;
}
</style>

<template>
  <div class="link-display-container">
    <div v-if="!url" class="no-url">
      <p>{{ $t('no_link_provided') }}</p>
    </div>

    <!-- 1. 如果是图片，就展示 <img> -->
    <div v-if="isImage" class="media-container">
      <img :src="url" :alt="$t('image_preview')" class="image-preview" />
    </div>

    <!-- 2. 如果是视频，就展示 <video> 播放器 -->
    <div v-else-if="isVideo" class="media-container">
      <video controls class="video-player">
        <source :src="url" :type="videoMimeType" />
        {{ $t('video_not_supported') }}
      </video>
    </div>

    <!-- 3. EPUB 渲染区域 (始终存在但根据条件显示) -->
    <div class="epub-wrapper" ref="wrapper" v-show="!isImage && !isVideo">
      <!-- 左侧隐藏触发区，用于悬停呼出目录 -->
      <div class="hover-target" @mouseenter="startShowTOCTimer" @mouseleave="cancelShowTOCTimer"></div>

      <!-- 目录侧边栏（悬浮覆盖在阅读区） -->
      <div class="toc-sidebar" :class="{ visible: showTOC }" @mouseenter="cancelHideTOCTimer" @mouseleave="startHideTOCTimer">
        <ul class="toc-list">
          <template v-for="(item, idx) in toc" :key="item.cfi || item.href || idx">
            <li :class="`toc-item level-${item.level}`">
              <button class="toc-link" @click="goTo(item)">
                {{ item.label }}
              </button>
              <ul v-if="item.subitems && item.subitems.length" class="toc-sublist">
                <template v-for="(sub, sidx) in item.subitems" :key="sub.cfi || sub.href || `${item.href}-${sidx}`">
                  <li :class="`toc-item level-${sub.level}`">
                    <button class="toc-link" @click="goTo(sub)">
                      {{ sub.label }}
                    </button>
                    <ul v-if="sub.subitems && sub.subitems.length" class="toc-sublist">
                      <template v-for="(sub2, s2idx) in sub.subitems" :key="sub2.cfi || sub2.href || `${sub.href}-${s2idx}`">
                        <li :class="`toc-item level-${sub2.level}`">
                          <button class="toc-link" @click="goTo(sub2)">
                            {{ sub2.label }}
                          </button>
                          <ul v-if="sub2.subitems && sub2.subitems.length" class="toc-sublist">
                            <template v-for="(sub3, s3idx) in sub2.subitems" :key="sub3.cfi || sub3.href || `${sub2.href}-${s3idx}`">
                              <li :class="`toc-item level-${sub3.level}`">
                                <button class="toc-link" @click="goTo(sub3)">
                                  {{ sub3.label }}
                                </button>
                              </li>
                            </template>
                          </ul>
                        </li>
                      </template>
                    </ul>
                  </li>
                </template>
              </ul>
            </li>
          </template>
        </ul>
      </div>

      <!-- EPUB 渲染区域 -->
      <div class="epub-viewer" ref="viewer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import ePub from 'epubjs';

const props = defineProps({
  url: {
    type: String,
    required: true
  }
});

const viewer = ref(null);
const wrapper = ref(null);
let book = null;
let rendition = null;
let observer = null;

const toc = ref([]);
const showTOC = ref(false);
let showTimer = null;
let hideTimer = null;

/** 1) 计算是否为图片（后缀 jpg/jpeg/png/gif/bmp/webp） */
const isImage = computed(() => {
  return /\.(jpe?g|png|gif|bmp|webp)(\?.*)?$/i.test(props.url);
});

/** 2) 计算是否为视频（后缀 mp4/webm/ogg/mov/m4v） */
const isVideo = computed(() => {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(props.url);
});

/** 3) 根据后缀生成 video 的 MIME 类型 */
const videoMimeType = computed(() => {
  if (!isVideo.value) return '';
  const ext = props.url.split('.').pop().toLowerCase().split('?')[0];
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogg': return 'video/ogg';
    case 'mov': return 'video/quicktime';
    case 'm4v': return 'video/mp4';
    default: return '';
  }
});

/** 4) 解析 EPUB 的目录结构 */
const parseNav = (items, level = 0) => {
  return items.map(item => ({
    label: item.label.trim(),
    href: item.href,
    cfi: null,
    level,
    subitems: item.subitems && item.subitems.length ? parseNav(item.subitems, level + 1) : []
  }));
};

/** 5) 定义深浅色主题 */
const lightTheme = {
  body: {
    color: '#1e293b',
    background: 'white',
    'line-height': '1.6',
    'font-family': `'CodeNewRoman', sans-serif`,
    padding: '1em'
  },
  a: {
    color: '#6366f1'
  },
  p: {
    color: '#334155'
  }
};
const darkTheme = {
  body: {
    color: '#e2e8f0',
    background: '#1e293b',
    'line-height': '1.6',
    'font-family': `'CodeNewRoman', sans-serif`,
    padding: '1em'
  },
  a: {
    color: '#93c5fd'
  },
  p: {
    color: '#e2e8f0'
  }
};

/** 6) 应用深/浅主题到 epub.js */
const applyTheme = (isDark) => {
  if (!rendition) return;
  rendition.themes.register('custom', isDark ? darkTheme : lightTheme);
  rendition.themes.select('custom');
};

/** 7) 加载 EPUB（只有当不是图片/视频时触发） */
const loadEpub = (epubUrl) => {
  if (!viewer.value) return;
  if (rendition) {
    rendition.destroy();
    rendition = null;
  }
  if (book) {
    book.destroy();
    book = null;
  }
  toc.value = [];

  book = ePub(epubUrl);
  book.ready
    .then(() => book.navigation.loaded)
    .then(() => {
      toc.value = parseNav(book.navigation.toc);
    })
    .catch(err => {
      console.error('EPUB 导航加载失败:', err);
    })
    .finally(() => {
      rendition = book.renderTo(viewer.value, {
        width: '100%',
        height: '100%',
        flow: 'scrolled',
        manager: 'default',
        spread: 'none'
      });
      rendition.display().then(() => {
        // 首次渲染完后，应用当前主题
        applyTheme(document.documentElement.classList.contains('dark'));
        setTimeout(() => {
          if (!rendition?.locations || !rendition.locations.generate) {
            // 如果不支持位置映射，全部 cfi 置空
            toc.value.forEach(item => { item.cfi = null; });
            return;
          }
          rendition.locations.generate(1000).then(() => {
            const assignCfi = (items) => {
              items.forEach(item => {
                try {
                  const cfi = rendition.locations.cfiFromHref(item.href);
                  item.cfi = cfi;
                } catch {
                  item.cfi = null;
                }
                if (item.subitems && item.subitems.length) {
                  assignCfi(item.subitems);
                }
              });
            };
            assignCfi(toc.value);
          }).catch(err => {
            console.error('EPUB 位置映射生成失败:', err);
            toc.value.forEach(item => { item.cfi = null; });
            window.dispatchEvent(new CustomEvent('epub-warning', {
              detail: '此电子书不支持高级导航功能，但仍可正常阅读'
            }));
          });
        }, 300);
      }).catch(err => {
        console.error('EPUB 初始渲染失败:', err);
      });
    });
};

/** 8) 跳转到目录项 */
const goTo = (item) => {
  if (!rendition) return;
  const target = item.cfi || item.href;
  hideTOCImmediate();
  rendition.display(target).catch(err => {
    console.error('EPUB 跳转失败:', err);
  });
};

/** 9) 目录显示/隐藏的计时器逻辑 */
const startShowTOCTimer = () => {
  cancelHideTOCTimer();
  if (showTOC.value) return;
  showTimer = setTimeout(() => {
    showTOC.value = true;
  }, 100);
};
const cancelShowTOCTimer = () => {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
};
const startHideTOCTimer = () => {
  cancelShowTOCTimer();
  if (!showTOC.value) return;
  hideTimer = setTimeout(() => {
    showTOC.value = false;
  }, 50);
};
const cancelHideTOCTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};
const hideTOCImmediate = () => {
  cancelShowTOCTimer();
  cancelHideTOCTimer();
  showTOC.value = false;
};

/** 10) 监听 props.url 变化：当且仅当既不是图片也不是视频时，才加载 EPUB */
watch(
  () => props.url,
  (newUrl) => {
    if (newUrl && !isImage.value && !isVideo.value) {
      loadEpub(newUrl);
    }
  },
  { immediate: true }
);

/** 11) onMounted 时，如果 url 已经存在且是 EPUB，就先加载 EPUB；同时监听 document.documentElement 的 class 变化以切换深浅主题 */
onMounted(() => {
  if (props.url && !isImage.value && !isVideo.value) {
    loadEpub(props.url);
  }
  const target = document.documentElement;
  observer = new MutationObserver(() => {
    const isDark = target.classList.contains('dark');
    applyTheme(isDark);
  });
  observer.observe(target, { attributes: true, attributeFilter: ['class'] });
});

/** 12) 组件卸载时清理 epub.js 实例和定时器 */
onUnmounted(() => {
  cancelShowTOCTimer();
  cancelHideTOCTimer();
  if (rendition) {
    rendition.destroy();
    rendition = null;
  }
  if (book) {
    book.destroy();
    book = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<style scoped>
@font-face {
  font-family: 'CodeNewRoman';
  src: url('@/assets/styles/fonts/CodeNewRomanNerdFontMono-Regular.otf');
  font-weight: 400 500 600;
  font-style: normal;
}

.link-display-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: 'CodeNewRoman', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.3s ease;
}

.dark .link-display-container {
  background: #0f172a;
}

/* 没有传入 URL 时的占位提示 */
.no-url {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #64748b;
  font-size: 1.2rem;
  font-style: italic;
  transition: color 0.3s ease;
}

.dark .no-url {
  color: #94a3b8;
}

/* ========== 1. 图片 / 视频 公共样式 ========== */
.media-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: #f8fafc;
  transition: background 0.3s ease;
}

.dark .media-container {
  background: #0f172a;
}

/* 图片预览 */
.image-preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.dark .image-preview {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 视频播放器 */
.video-player {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background: black;
}

.dark .video-player {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* ========== 2. EPUB 渲染区域 ========== */
.epub-wrapper {
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 12px;
  margin: 16px;
  background: white;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.dark .epub-wrapper {
  background: #1e293b;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.hover-target {
  position: absolute;
  top: 0;
  left: 0;
  width: 60px;
  height: 100%;
  z-index: 10;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0) 100%);
  transition: all 0.3s ease;
}

.hover-target:hover {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
}

.dark .hover-target {
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0) 100%);
}

.dark .hover-target:hover {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(0, 0, 0, 0) 100%);
}

/* 目录侧边栏 */
.toc-sidebar {
  position: absolute;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 280px;
  background: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transform: translateX(-105%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 20;
  overflow-y: auto;
  border-radius: 12px;
  padding: 16px 0;
}

.dark .toc-sidebar {
  background: #1e293b;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.toc-sidebar.visible {
  transform: translateX(0);
}

.toc-sidebar::-webkit-scrollbar {
  width: 8px;
}

.toc-sidebar::-webkit-scrollbar-thumb {
  background: rgba(123, 97, 255, 0.4);
  border-radius: 4px;
}

.toc-sidebar::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.8);
  border-radius: 4px;
}

.dark .toc-sidebar::-webkit-scrollbar-thumb {
  background: rgba(123, 97, 255, 0.6);
}

.dark .toc-sidebar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.8);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: 4px;
}

.toc-item .toc-link {
  background: none;
  border: none;
  text-align: left;
  padding: 10px 24px;
  font-size: 0.95rem;
  color: #334155;
  width: 100%;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
}

.toc-item .toc-link:hover {
  background: #f8fafc;
  color: #6366f1;
  transform: translateX(4px);
}

.toc-item .toc-link:active {
  transform: translateX(4px) scale(0.98);
}

.dark .toc-item .toc-link {
  color: #e2e8f0;
}

.dark .toc-item .toc-link:hover {
  background: #1e293b;
  color: #818cf8;
}

.level-0 .toc-link {
  padding-left: 8px;
}

.level-1 .toc-link {
  padding-left: 20px;
}

.level-2 .toc-link {
  padding-left: 32px;
}

.level-3 .toc-link {
  padding-left: 44px;
}

.toc-sublist {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* EPUB 渲染区域 */
.epub-viewer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  background: white;
  scroll-behavior: smooth;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.dark .epub-viewer {
  background: #1e293b;
}

.epub-viewer::-webkit-scrollbar {
  width: 8px;
}

.epub-viewer::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.5);
  border-radius: 4px;
}

.epub-viewer::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.5);
}

/* epub.js 渲染容器 */
.viewer {
  width: 100%;
  min-height: 100%;
  padding: 24px;
  box-sizing: border-box;
}
</style>

<template>
  <div class="link-display-container">
    <div v-if="!url" class="no-url">
      <p>未提供 EPUB 链接。</p>
    </div>
    <div v-else class="epub-wrapper" ref="wrapper">
      <!-- 左侧隐藏触发区，用于悬停呼出目录 -->
      <div class="hover-target" @mouseenter="startShowTOCTimer" @mouseleave="cancelShowTOCTimer"></div>

      <!-- 目录侧边栏（悬浮覆盖在阅读区） -->
      <div class="toc-sidebar" :class="{ visible: showTOC }" @mouseenter="cancelHideTOCTimer"
        @mouseleave="startHideTOCTimer">
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
                      <template v-for="(sub2, s2idx) in sub.subitems"
                        :key="sub2.cfi || sub2.href || `${sub.href}-${s2idx}`">
                        <li :class="`toc-item level-${sub2.level}`">
                          <button class="toc-link" @click="goTo(sub2)">
                            {{ sub2.label }}
                          </button>
                          <ul v-if="sub2.subitems && sub2.subitems.length" class="toc-sublist">
                            <template v-for="(sub3, s3idx) in sub2.subitems"
                              :key="sub3.cfi || sub3.href || `${sub2.href}-${s3idx}`">
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
import { ref, watch, onMounted, onUnmounted } from 'vue';
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

const parseNav = (items, level = 0) => {
  return items.map(item => ({
    label: item.label.trim(),
    href: item.href,
    cfi: null,
    level,
    subitems: item.subitems && item.subitems.length ? parseNav(item.subitems, level + 1) : []
  }));
};

const lightTheme = {
  body: {
    color: '#1e293b',
    background: 'white',
    'line-height': '1.6',
    'font-family': `'Inter', sans-serif`,
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
    'font-family': `'Inter', sans-serif`,
    padding: '1em'
  },
  a: {
    color: '#93c5fd'
  },
  p: {
    color: '#e2e8f0'
  }
};

const applyTheme = (isDark) => {
  if (!rendition) return;
  rendition.themes.register('custom', isDark ? darkTheme : lightTheme);
  rendition.themes.select('custom');
};

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
        console.log('EPUB 初始渲染完成');
        applyTheme(document.documentElement.classList.contains('dark'));
        setTimeout(() => {
          rendition.locations.generate().then(() => {
            console.log('位置映射生成完成');
            const assignCfi = (items) => {
              items.forEach(item => {
                try {
                  const cfi = rendition.locations.cfiFromHref(item.href);
                  item.cfi = cfi;
                } catch (e) {
                  console.warn('CFI生成失败:', item.href, e);
                  item.cfi = null;
                }
                if (item.subitems && item.subitems.length) {
                  assignCfi(item.subitems);
                }
              });
            };
            assignCfi(toc.value);
          }).catch(err => {
            console.warn('位置映射生成失败:', err);
          });
        }, 300);
      }).catch(err => {
        console.error('EPUB 渲染失败:', err);
      });
    });
};

const goTo = (item) => {
  if (!rendition) return;
  const target = item.cfi || item.href;
  hideTOCImmediate();
  console.log('准备跳转到:', target);
  rendition.display(target).catch(err => {
    console.error('EPUB 跳转失败:', err);
  });
};

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

watch(
  () => props.url,
  (newUrl) => {
    if (newUrl) {
      loadEpub(newUrl);
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.url) {
    loadEpub(props.url);
  }

  // 监听 HTML class 切换，动态应用主题
  const target = document.documentElement;
  observer = new MutationObserver(() => {
    const isDark = target.classList.contains('dark');
    applyTheme(isDark);
  });
  observer.observe(target, { attributes: true, attributeFilter: ['class'] });
});

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
.link-display-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: background 0.3s ease;
}

.dark .link-display-container {
  background: #0f172a;
}

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

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* EPUB 整体包裹器 */
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

/* 左侧触发区域 */
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

/* 目录侧边栏（悬浮） */
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

/* 当 showTOC=true 时，将侧边栏滑入 */
.toc-sidebar.visible {
  transform: translateX(0);
}

/* 目录滚动条样式 */
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

/* 目录列表样式 */
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

/* 按层级缩进 */
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

/* 子目录列表 */
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

/* EPUB 滚动条样式 */
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

<template>
  <div class="book-wrapper" ref="wrapper">
    <div v-if="showModal" class="modal-backdrop"></div>
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <EntryForm :initialEntry="editingEntry" @close="closeModal" />
      </div>
    </div>

    <div class="book-wrapper-inner">
      <div class="page-nav prev" @click="flipPagePrev" :class="{ disabled: isAtFirstPage }">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
      </div>

      <div class="book-container" ref="container" :class="{ blurred: showModal }"
        @contextmenu.prevent="handleContextMenu">
      <!-- 封面页（第一页） -->
      <div class="page cover front">
        <div class="cover-content">
          <div class="title">{{ $t('my_anime_journal') }}</div>
          <div class="hint">{{ $t('right_click_to_flip') }}</div>
        </div>
      </div>

      <!-- 封底内页（第二页） -->
      <div class="page cover-back inner">
        <div class="content-page">
          <div class="page-content">
            <EntryList @result-click="openEntryDetail" />
          </div>
        </div>
      </div>

      <!-- 搜索页（第三页） -->
      <div class="page first-page inner">
        <div class="content-page">
          <SearchComponent @result-click="openEntryDetail" />
        </div>
      </div>

      <!-- 详情页（第四页） -->
      <div class="page inner">
        <div class="content-page">
          <EntryDetail :entryId="currentEntryId" />
        </div>
      </div>

      <!-- EPUB 展示页（第五页）-->
      <div class="page inner">
        <div class="content-page">
          <LinkDisplay v-if="currentEpubUrl" :url="currentEpubUrl" />
          <div v-else class="no-epub-placeholder">
            <p>{{ $t('no_link_detected') }}</p>
          </div>
        </div>
      </div>

      <!-- 保留的空白页 -->
      <div class="page inner">
        <div class="content-page">
          <div class="single-page-content">
            <div class="additional-content">{{ $t('more_content_area_1') }}</div>
            <div class="additional-content">{{ $t('more_content_area_2') }}</div>
          </div>
        </div>
      </div>

      <div class="page inner">
        <div class="content-page">
          <div class="single-page-content">
            <div class="additional-content">{{ $t('more_content_area_3') }}</div>
            <div class="additional-content">{{ $t('more_content_area_4') }}</div>
          </div>
        </div>
      </div>

      <!-- 书页最后一页 -->
      <div class="page cover back"></div>
    </div>

    <div class="page-nav next" @click="flipPageNext" :class="{ disabled: isAtLastPage }">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"></path>
      </svg>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { PageFlip } from 'page-flip';
import EntryList from './EntryList.vue';
import EntryForm from './EntryForm.vue';
import EntryDetail from './EntryDetail.vue';
import SearchComponent from './SearchComponent.vue';
import LinkDisplay from './LinkDisplay.vue';

const wrapper = ref(null);
const container = ref(null);
const showModal = ref(false);
const editingEntry = ref(null);
const pageFlip = ref(null);
const originalOverflow = ref('');
const currentEntryId = ref(null); // 当前显示的条目ID
const currentEpubUrl = ref(null); // 当前显示的 EPUB 链接
const currentPageIndex = ref(0); // 当前页索引
const totalPages = ref(8); // 总页数

const isAtFirstPage = computed(() => currentPageIndex.value <= 0);
const isAtLastPage = computed(() => currentPageIndex.value === totalPages.value - 1);

// 打开条目详情页并翻页
const openEntryDetail = (entryId) => {
  currentEntryId.value = entryId;

  // 翻到详情页（第四页，索引为 3）
  if (pageFlip.value) {
    pageFlip.value.flip(3);
  }
};

// 计算书本的尺寸以适应窗口大小
const calculateBookSize = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = 600 / 840;
  const scale = 1.08;
  let width = vw * 0.8 * scale;
  let height = width / ratio;

  if (height > vh * 0.8 * scale) {
    height = vh * 0.8 * scale;
    width = height * ratio;
  }

  return { width, height };
};

// 处理窗口大小变化时书本尺寸的更新
const handleResize = () => {
  if (pageFlip.value) {
    const { width, height } = calculateBookSize();
    pageFlip.value.update({ width, height });
    wrapper.value.style.width = `${width + 40}px`;
  }
};

// 打开编辑表单模态框
const openModal = () => {
  showModal.value = true;
  originalOverflow.value = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  if (pageFlip.value) {
    pageFlip.value.turnToPage(pageFlip.value.getCurrentPageIndex(), true);
  }
};

// 关闭编辑表单模态框
const closeModal = () => {
  showModal.value = false;
  document.body.style.overflow = originalOverflow.value;
  document.removeEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
  if (pageFlip.value) {
    pageFlip.value.update({ flippingTime: 1000 });
  }
};


// 收到外部请求打开某条目编辑
function openEditModal(entry) {
  editingEntry.value = entry;
  openModal();
}

// 处理键盘按下事件，ESC 键关闭模态框
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
};

// 翻到下一页
const flipPageNext = () => {
  if (!showModal.value && pageFlip.value && !isAtLastPage.value) {
    pageFlip.value.flipNext();
  }
};

// 翻到上一页
const flipPagePrev = () => {
  if (!showModal.value && pageFlip.value && !isAtFirstPage.value) {
    pageFlip.value.flipPrev();
  }
};

// 处理右键点击事件，防止默认行为
const handleContextMenu = (e) => {
  e.preventDefault();
};

// 组件挂载后初始化 PageFlip，并监听自定义事件
onMounted(() => {
  const { width, height } = calculateBookSize();

  pageFlip.value = new PageFlip(container.value, {
    width,
    height,
    size: 'fixed',
    usePortrait: false,
    showCover: true,
    disableFlipByClick: true,
    showPageCorners: false,
    flippingTime: 1000,
    swipeDistance: 9999,
    hoverDistance: 0,
    hoverArea: 0,
    padding: 0,
    useMouseEvents: false,
    useTouchEvents: false,
    shadows: {
      front: { position: 'front', color: 'rgba(0,0,0,0.1)', width: 10 },
      back: { position: 'back', color: 'rgba(0,0,0,0.05)', width: 8 }
    }
  });

  // 监听“开始编辑”事件
  window.addEventListener('start-edit-entry', (e) => {
    openEditModal(e.detail);
  });

  // 监听“打开媒体”事件
  window.addEventListener('open-media', (e) => {
    const mediaUrl = e.detail;
    console.log('收到 open-media 事件，URL:', mediaUrl);
    if (typeof mediaUrl === 'string') {
      currentEpubUrl.value = mediaUrl;
      // 翻到媒体展示页（第五页，索引为 4）
      pageFlip.value?.flip(4);
    }
  });

  // 加载所有 .page DOM 节点
  const pages = Array.from(container.value.querySelectorAll('.page'));
  pageFlip.value.loadFromHTML(pages);

  wrapper.value.style.width = `${width + 40}px`;

  window.addEventListener('resize', handleResize);

  // 监听翻页事件以更新当前页索引
  pageFlip.value.on('flip', (e) => {
    currentPageIndex.value = e.data;
  });

  // 监听"打开表单"事件
  window.addEventListener('open-form', (e) => {
    // 清空上一次的编辑数据
    editingEntry.value = null;
    openModal();
  });
  window.addEventListener('close-form', closeModal);
  window.addEventListener('edit-entry', (e) => openEditModal(e.detail));
  
  console.log('BookFlip 组件已挂载，开始监听 open-media 事件');
});


// 组件卸载前移除事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('open-form', (e) => {
    editingEntry.value = null;
    openModal();
  });
  window.removeEventListener('close-form', closeModal);
  window.removeEventListener('start-edit-entry', openEditModal);
  window.removeEventListener('open-media', (e) => {
    const mediaUrl = e.detail;
    currentEpubUrl.value = mediaUrl;
    pageFlip.value?.flip(4);
  });
  document.removeEventListener('keydown', handleKeydown);
  
  console.log('BookFlip 组件已卸载，移除事件监听');

});
</script>

<style>
body.modal-open .pf__page,
body.modal-open .pf__page-surface,
body.modal-open .pf__page-content {
  transition: none !important;
  will-change: auto !important;
}

body.modal-open .pf__page-cover-front,
body.modal-open .pf__page-cover-back {
  animation: none !important;
  pointer-events: none;
}
</style>

<style scoped>
.book-wrapper {
  margin: 50px auto;
  perspective: 1500px;
  display: flex;
  justify-content: center;
  width: fit-content;
  position: relative;
  z-index: 1;
}

.book-wrapper-inner {
  display: flex;
  align-items: center;
  gap: 20px;
}

.page-nav {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.page-nav:hover:not(.disabled) {
  background: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.page-nav.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

.dark .page-nav {
  background: #1e293b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.dark .page-nav:hover:not(.disabled) {
  background: #334155;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: transparent;
  z-index: 9998;
  pointer-events: auto;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: none;
  pointer-events: auto;
}

.modal-content {
  background: white;
  padding: 0.8rem 1rem;
  border-radius: 0.7rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 900px;
  max-height: 90%;
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: thin;
  backdrop-filter: none;
  clip-path: inset(0 0 0 0);
}

.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #c5c5c5;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.book-container {
  position: relative;
  --page-width: calc(80vw * 1.08 - 20px);
  --page-height: calc(var(--page-width) * 1.4);
  transition: filter 0.3s ease-in-out;
}

.book-container.blurred {
  filter: blur(5px);
}

.pf__page,
.pf__page-surface {
  width: var(--page-width) !important;
  height: var(--page-height) !important;
  overflow: visible !important;
  display: flex !important;
  pointer-events: none;
}

.pf__page .content-page,
.pf__page .cover-content,
.pf__page .single-page-content,
.pf__page .page-content {
  pointer-events: auto;
}

.cover.front {
  cursor: pointer;
  background: url('/images/front-cover.png') center/cover no-repeat;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.cover.back {
  cursor: pointer;
  background: url('/images/back-cover.png') center/cover no-repeat;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.cover-back {
  background-color: #f9f9f9;
  border-right: 1px solid #eee;
}

.first-page,
.inner {
  background: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.content-page {
  width: 100%;
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  overflow-y: auto;
}

.single-page-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  width: 100%;
}

.single-page-content > .additional-content {
  flex: 1;
  padding: 20px;
}

.cover-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 20px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.hint {
  font-size: 1.2rem;
  opacity: 0.8;
  animation: pulse 2s infinite;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

/* EPUB 展示页若没有 URL 时的占位提示 */
.no-epub-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #94a3b8;
  font-size: 1.1rem;
  font-style: italic;
}

/* === Dark Theme Support === */
.dark .modal-overlay {
  background-color: rgba(0, 0, 0, 0.5);
}

.dark .modal-content {
  background: #1e293b; 
  color: #f1f5f9;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
}

.dark .cover-back {
  background-color: #1e293b;
  border-right: 1px solid #334155;
}

.dark .first-page,
.dark .inner {
  background: #0f172a;
  color: #f1f5f9;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
}

.dark .content-page {
  background: transparent;
}

.dark .no-epub-placeholder {
  color: #cbd5e1;
}

.dark .cover-content {
  color: #f1f5f9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.dark .book-wrapper {
  background-color: transparent !important;
}

.dark .modal-backdrop {
  background-color: transparent !important;
}
</style>
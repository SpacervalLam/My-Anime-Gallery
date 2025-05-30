<template>
  <div class="book-wrapper" ref="wrapper">
    <div v-if="showModal" class="modal-backdrop"></div>
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <EntryForm :initialEntry="editingEntry" @close="closeModal" />
      </div>
    </div>

    <div class="book-container" ref="container" :class="{ blurred: showModal }" @mousedown.capture="handleMouseDown"
      @contextmenu.prevent="handleContextMenu">
      <div class="page cover front" @contextmenu.prevent="flipPageNext">
        <div class="cover-content">
          <div class="title">My Anime Journal</div>
          <div class="hint">Right-click to flip</div>
        </div>
      </div>

      <div class="page cover-back inner">
        <div class="content-page">
          <div class="page-content">
            <EntryList />
          </div>
        </div>
      </div>

      <div class="page first-page inner">
        <div class="content-page">
          <SearchComponent @result-click="openEntryDetail" />
        </div>
      </div>

      <!-- 新增详情页 -->
      <div class="page inner">
        <div class="content-page">
          <EntryDetail :entryId="currentEntryId" />
        </div>
      </div>

      <div class="page inner">
        <div class="content-page">
          <div class="single-page-content">
            <div class="additional-content">更多内容区域1</div>
            <div class="additional-content">更多内容区域2</div>
          </div>
        </div>
      </div>

      <div class="page inner">
        <div class="content-page">
          <div class="single-page-content">
            <div class="additional-content">更多内容区域1</div>
            <div class="additional-content">更多内容区域2</div>
          </div>
        </div>
      </div>

      <div class="page inner">
        <div class="content-page">
          <div class="single-page-content">
            <div class="additional-content">更多内容区域3</div>
            <div class="additional-content">更多内容区域4</div>
          </div>
        </div>
      </div>

      <div class="page cover back" @contextmenu.prevent="flipPagePrev"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PageFlip } from 'page-flip';
import EntryList from './EntryList.vue';
import EntryForm from './EntryForm.vue';
import EntryDetail from './EntryDetail.vue';
import SearchComponent from './SearchComponent.vue';

const wrapper = ref(null);
const container = ref(null);
const showModal = ref(false);
const editingEntry = ref(null);
const pageFlip = ref(null);
const originalOverflow = ref('');
const currentEntryId = ref(null); // 当前显示的条目ID

// 打开条目详情页并翻页
const openEntryDetail = (entryId) => {
  currentEntryId.value = entryId;

  // 翻到详情页（第3页，索引为3）
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

// 显示模态框并处理其显示时的副作用
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

// 关闭模态框并恢复之前的副作用
const closeModal = () => {
  showModal.value = false;
  document.body.style.overflow = originalOverflow.value;
  document.removeEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);

  if (pageFlip.value) {
    pageFlip.value.update({ flippingTime: 1000 });
  }
};

function openEditModal(entry) {
  console.log('[BookFlip] openEditModal', entry.id);
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
  if (!showModal.value) pageFlip.value?.flipNext();
};

// 翻到上一页
const flipPagePrev = () => {
  if (!showModal.value) pageFlip.value?.flipPrev();
};

// 处理鼠标按下事件，防止在封面页进行翻页操作
const handleMouseDown = (e) => {
  const currentPage = pageFlip.value?.getCurrentPageIndex();
  const lastPage = pageFlip.value?.getPageCount() - 1;

  if (currentPage === 0 || currentPage === lastPage) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (e.button === 2) return;
  e.stopPropagation();
};

// 处理右键点击事件，防止默认行为
const handleContextMenu = (e) => {
  e.preventDefault();
};

// 组件挂载后初始化书本翻页效果并设置事件监听器
onMounted(() => {
  const { width, height } = calculateBookSize();

  pageFlip.value = new PageFlip(container.value, {
    width,
    height,
    size: 'fixed',
    usePortrait: false,
    showCover: true,
    disableFlipByClick: true,
    flippingTime: 1000,
    swipeDistance: 9999,
    hoverDistance: 10,
    hoverArea: 0.1,
    padding: 0,
    shadows: {
      front: { position: 'front', color: 'rgba(0,0,0,0.1)', width: 10 },
      back: { position: 'back', color: 'rgba(0,0,0,0.05)', width: 8 }
    }
  });

  // 监听“开始编辑”事件
  window.addEventListener('start-edit-entry', (e) => {
    openEditModal(e.detail);
  });

  const pages = Array.from(container.value.querySelectorAll('.page'));
  pageFlip.value.loadFromHTML(pages);

  wrapper.value.style.width = `${width + 40}px`;

  window.addEventListener('resize', handleResize);
  window.addEventListener('open-form', (e) => {
    // 清空上一次的编辑数据
    editingEntry.value = null;
    openModal();
  });
  window.addEventListener('close-form', closeModal);
  window.addEventListener('edit-entry', (e) => openEditModal(e.detail));
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
  document.removeEventListener('keydown', handleKeydown);

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

.modal-overlay {
  z-index: 9999;
  pointer-events: auto;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: transparent;
  z-index: 9998;
  pointer-events: none;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background: white;
  padding: 0.8rem 0.1rem;
  border-radius: 0.7rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-height: 90%;
  overflow-y: scroll;
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

.modal-content::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari and Opera */
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
}

.cover.front {
  cursor: pointer;
  background: url('/images/front-cover.png') center/cover no-repeat;
}

.cover.back {
  cursor: pointer;
  background: url('/images/back-cover.png') center/cover no-repeat;
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

.single-page-content>.additional-content {
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
}

.title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 20px;
}

.hint {
  font-size: 1.2rem;
  opacity: 0.8;
  animation: pulse 2s infinite;
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
</style>
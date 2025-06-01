<template>
  <div
    class="app-container"
    :class="{ 'dark': isDarkMode, 'fade-out': isAppClosing }"
  >
    <!-- 右上角菜单触发按钮 -->
    <div class="menu-trigger" @click="toggleMenu">
      <span class="menu-icon">☰</span>
    </div>

    <!-- 菜单栏 -->
    <div class="theme-menu" :class="{ visible: isMenuVisible }">
      <!-- 主题切换 -->
      <button class="theme-toggle" @click="toggleTheme">
        {{ isDarkMode ? $t('lightMode') : $t('darkMode') }}
      </button>
      <!-- 导出数据 -->
      <button class="menu-action" @click="openExportModal">
        {{ $t('exportData') }}
      </button>
      <!-- 导入数据 -->
      <button class="menu-action" @click="openImportModal">
        {{ $t('importData') }}
      </button>
      <!-- 设置 -->
      <button class="menu-action" @click="openSettingsModal">
        {{ $t('settings') }}
      </button>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <BookFlip />
    </div>

    <!-- 导出数据模态框 -->
    <div v-if="showExportModal" class="modal-overlay" @click.self="closeExportModal">
      <div class="modal-box">
        <h3 class="modal-title">{{ $t('exportData') }}</h3>
        <p>{{ $t('selectExportDirectory') }}</p>

        <!-- 导出选项：封面、音乐复选框 -->
        <div class="export-options">
          <label>
            <input type="checkbox" v-model="exportIncludeMusic" />
            {{ $t('includeBackgroundMusic') }}
          </label>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-buttons">
          <button class="btn btn-confirm" @click="handleExport" :disabled="exporting">
            <!-- 导出进行时 显示旋转动画 -->
            <span v-if="exporting" class="spinner"></span>
            <span v-else>{{ $t('confirmExport') }}</span>
          </button>
          <button class="btn btn-cancel" @click="closeExportModal" :disabled="exporting">
            {{ $t('cancel') }}
          </button>
        </div>

        <!-- 导出结果反馈 -->
        <p v-if="exportMsg" :class="exportStatus === 'success' ? 'feedback-success' : 'feedback-error'">
          {{ exportMsg }}
          <template v-if="exportStatus === 'success'">
            <button class="btn-link" @click="openArchiveFolder">
              {{ $t('openFolder') }}
            </button>
          </template>
        </p>
      </div>
    </div>

    <!-- 导入数据模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-box">
        <h3 class="modal-title">{{ $t('importData') }}</h3>
        <p>{{ $t('selectSpacervalFile') }}</p>

        <div class="modal-buttons">
          <button class="btn btn-confirm" @click="handleImport" :disabled="importing">
            <span v-if="importing" class="spinner"></span>
            <span v-else>{{ $t('select') }}</span>
          </button>
          <button class="btn btn-cancel" @click="closeImportModal" :disabled="importing">
            {{ $t('cancel') }}
          </button>
        </div>

        <!-- 导入结果反馈 -->
        <div v-if="importMsg" :class="importStatus === 'success' ? 'feedback-success' : 'feedback-error'">
          <template v-if="importStatus === 'success'">
            <p>{{ $t('successfullyImported', { count: importedCount }) }}</p>
            <div class="conflict-container" v-if="conflictTitles.length > 0">
              <p>{{ $t('conflictItems', { count: conflictTitles.length }) }}</p>
              <ul class="conflict-list">
                <li v-for="title in conflictTitles" :key="title">{{ title }}</li>
              </ul>
            </div>
          </template>
          <template v-else>
            <p>{{ importMsg }}</p>
          </template>
        </div>
      </div>
    </div>

    <!-- 设置模态框 -->
    <Settings ref="settingsModal" />
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import BookFlip from './components/BookFlip.vue';
import Settings from './components/Settings.vue';

// ------------------- 主题切换 -------------------
const isDarkMode = ref(false);
provide('isDarkMode', isDarkMode);

const isMenuVisible = ref(false);
const toggleMenu = () => {
  isMenuVisible.value = !isMenuVisible.value;
};

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
  localStorage.setItem('darkMode', isDarkMode.value);
};
onMounted(() => {
  const savedMode = localStorage.getItem('darkMode') === 'true';
  isDarkMode.value = savedMode;
  document.documentElement.classList.toggle('dark', savedMode);
});

// ------------------- 导出相关 -------------------
const showExportModal = ref(false);
const exportIncludeImages = ref(true);  // 是否导出封面
const exportIncludeMusic = ref(true);   // 是否导出音乐
const exporting = ref(false);           // 导出中状态
const exportMsg = ref('');
const exportStatus = ref('');
let archivePath = '';

const openExportModal = () => {
  exportMsg.value = '';
  exportStatus.value = '';
  exportIncludeImages.value = true;
  exportIncludeMusic.value = true;
  showExportModal.value = true;
};
const closeExportModal = () => {
  if (!exporting.value) {
    showExportModal.value = false;
  }
};

const handleExport = async () => {
  if (exporting.value) return;
  exporting.value = true;
  exportMsg.value = '';
  exportStatus.value = '';
  try {
    // 调用预加载层的 IPC，传递用户勾选选项
    const result = await window.electronAPI.exportData({
      includeImages: exportIncludeImages.value,
      includeMusic: exportIncludeMusic.value
    });
    if (result.success) {
      archivePath = result.archivePath;
      exportMsg.value = `✔ ${$t('exportSuccess')}！路径：${archivePath}`;
      exportStatus.value = 'success';
    } else {
      exportMsg.value = `✖ ${$t('exportFailed')}：${result.message}`;
      exportStatus.value = 'error';
    }
  } catch (err) {
    console.error('导出异常：', err);
    exportMsg.value = `✖ ${$t('exportException')}：${err.message}`;
    exportStatus.value = 'error';
  } finally {
    exporting.value = false;
  }
};

// 在资源管理器中高亮显示 .spacerval 文件
const openArchiveFolder = async () => {
  if (!archivePath) return;
  try {
    await window.electronAPI.showInFolder(archivePath);
  } catch (err) {
    console.error('调用 showInFolder 失败：', err);
  }
};

// ------------------- 导入相关 -------------------
const showImportModal = ref(false);
const importing = ref(false);
const importMsg = ref('');
const importStatus = ref(''); // 'success' / 'error'
const conflictTitles = ref([]);
const importedCount = ref(0);

const openImportModal = () => {
  importMsg.value = '';
  importStatus.value = '';
  showImportModal.value = true;
};
const closeImportModal = () => {
  if (!importing.value) {
    showImportModal.value = false;
  }
};

const handleImport = async () => {
  if (importing.value) return;
  importing.value = true;
  importMsg.value = '';
  importStatus.value = '';
  conflictTitles.value = [];
  importedCount.value = 0;
  try {
    const result = await window.electronAPI.importData();
    if (result.success) {
      importMsg.value = $t('importComplete');
      importStatus.value = 'success';
      window.dispatchEvent(new Event('entry-saved'));
      importedCount.value = result.importedCount || 0;
      if (result.conflictTitles && result.conflictTitles.length > 0) {
        conflictTitles.value = result.conflictTitles;
      }
    } else {
      importMsg.value = `✖ ${$t('importFailed')}：${result.message}`;
      importStatus.value = 'error';
    }
  } catch (err) {
    console.error('导入异常：', err);
    importMsg.value = `✖ ${$t('importException')}：${err.message}`;
    importStatus.value = 'error';
  } finally {
    importing.value = false;
  }
};

const settingsModal = ref(null);

// 打开设置模态框
const openSettingsModal = () => {
  settingsModal.value?.open();
};
</script>

<style>
/* ================= 全局 & 布局 ================ */
html,
body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

html.dark, body.dark {
  background-color: transparent !important;
}

.app-container.dark {
  background-color: transparent !important;
}

.app-container.dark {
  background: #1e293b;
  color: #f1f5f9;
}

/* 右上角悬浮菜单 */
.theme-menu-trigger {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 80px;
  height: 80px;
  z-index: 100;
}

/* 菜单触发按钮样式 */
.menu-trigger {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: background 0.3s ease;
}

.menu-trigger:hover {
  background: #2563eb;
}

.menu-icon {
  font-size: 18px;
  font-weight: bold;
}

/* 重构菜单栏样式 */
.theme-menu {
  position: fixed;
  top: 70px;
  right: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.theme-menu.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* 深色模式优化 */
.dark .theme-menu {
  background: #1e293b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-toggle,
.menu-action {
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
  font-size: 14px;
}

.theme-toggle:hover,
.menu-action:hover {
  background: #f3f4f6;
}

.dark .theme-toggle,
.dark .menu-action {
  color: white;
}

.dark .theme-toggle:hover,
.dark .menu-action:hover {
  background: #334155;
}

.main-content {
  width: 100%;
  height: 100%;
}

/* ================== 模态框 ================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 360px;
  max-width: 90%;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.dark .modal-overlay {
  background-color: transparent !important;
}

.dark .modal-box {
  background-color: transparent !important;
  color: #f1f5f9;
}

.modal-title {
  margin: 0 0 12px;
  font-size: 18px;
}

/* 导出选项区 (复选框) */
.export-options {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
}

.export-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.export-options input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

/* 按钮区 */
.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-confirm {
  background: #3b82f6;
  color: white;
}

.btn-confirm:hover {
  background: #2563eb;
}

.btn-cancel {
  background: #e5e7eb;
  color: #111827;
}

.btn-cancel:hover {
  background: #d1d5db;
}

.dark .btn-confirm {
  background: #2563eb;
}

.dark .btn-confirm:hover {
  background: #1e40af;
}

.dark .btn-cancel {
  background: #475569;
  color: #f1f5f9;
}

.dark .btn-cancel:hover {
  background: #334155;
}

/* 结果反馈 */
.feedback-success {
  margin-top: 12px;
  color: #10b981;
  /* 绿色 */
}

.feedback-error {
  margin-top: 12px;
  color: #ef4444;
  /* 红色 */
}

/* 冲突条目样式 */
.conflict-container {
  margin-top: 8px;
  color: #ef4444;
}

.conflict-list {
  padding-left: 20px;
  margin-top: 4px;
}

.conflict-list li {
  margin-bottom: 4px;
}

/* “在文件夹中显示” 链接样式 */
.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  margin-left: 8px;
  text-decoration: underline;
  font-size: 13px;
}

.btn-link:hover {
  color: #2563eb;
}

/* ================= 加载中旋转动画 ================ */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

.dark .spinner {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.6);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<template>
  <div class="app-container" :class="{ 'dark': isDarkMode }">
    <!-- 右上角悬停菜单 -->
    <div class="theme-menu-trigger" @mouseenter="startShowMenuTimer" @mouseleave="cancelShowMenuTimer">
      <div class="theme-menu" :class="{ visible: showMenu }">
        <!-- 切换主题按钮 -->
        <button class="theme-toggle" @click="toggleTheme">
          {{ isDarkMode ? '浅色模式' : '深色模式' }}
        </button>
        <!-- 导出数据 按钮 -->
        <button class="menu-action" @click="openExportModal">导出数据</button>
        <!-- 导入数据 按钮 -->
        <button class="menu-action" @click="openImportModal">导入数据</button>
      </div>
    </div>

    <!-- 主内容区，BookFlip -->
    <div class="main-content">
      <BookFlip />
    </div>

    <!-- 导出数据模态框 -->
    <div v-if="showExportModal" class="modal-overlay" @click.self="closeExportModal">
      <div class="modal-box">
        <h3 class="modal-title">导出数据</h3>
        <p>请选择导出数据的存储目录</p>
        <div class="modal-buttons">
          <button class="btn btn-confirm" @click="handleExport">确认导出</button>
          <button class="btn btn-cancel" @click="closeExportModal">取消</button>
        </div>
        <p v-if="exportMsg" :class="exportStatus === 'success' ? 'feedback-success' : 'feedback-error'">
          {{ exportMsg }}
          <!-- 如果导出成功，显示一个“打开压缩包所在文件夹”按钮 -->
          <template v-if="exportStatus === 'success'">
            <button class="btn-link" @click="openArchiveFolder">打开所在文件夹</button>
          </template>
        </p>
      </div>
    </div>

    <!-- 导入数据模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-box">
        <h3 class="modal-title">导入数据</h3>
        <p> 请选择要导入的 .spacerval 文件 </p>
        <div class="modal-buttons">
          <button class="btn btn-confirm" @click="handleImport">确认导入</button>
          <button class="btn btn-cancel" @click="closeImportModal">取消</button>
        </div>
        <p v-if="importMsg" :class="importStatus === 'success' ? 'feedback-success' : 'feedback-error'">
          {{ importMsg }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from 'vue';
import BookFlip from './components/BookFlip.vue';

// ------------- 主题切换 ---------------
const isDarkMode = ref(false);
provide('isDarkMode', isDarkMode);

const showMenu = ref(false);
let menuTimer = null;

// 控制导出/导入模态框显示
const showExportModal = ref(false);
const showImportModal = ref(false);

// 导出相关状态
const exportMsg = ref('');
const exportStatus = ref(''); // 'success' | 'error'
let archivePath = '';         // 保存后端返回的 .spacerval 路径

// 导入相关状态
const importMsg = ref('');
const importStatus = ref(''); // 'success' | 'error'

// 主题切换函数
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('dark', isDarkMode.value);
  localStorage.setItem('darkMode', isDarkMode.value);
};

// 菜单显示与隐藏
const startShowMenuTimer = () => {
  menuTimer = setTimeout(() => {
    showMenu.value = true;
  }, 10);
};
const cancelShowMenuTimer = () => {
  clearTimeout(menuTimer);
  menuTimer = null;
  showMenu.value = false;
};

// 初始化主题样式
onMounted(() => {
  const savedMode = localStorage.getItem('darkMode') === 'true';
  isDarkMode.value = savedMode;
  document.documentElement.classList.toggle('dark', savedMode);
});

// 打开/关闭 导出 模态框
const openExportModal = () => {
  exportMsg.value = '';
  exportStatus.value = '';
  showExportModal.value = true;
};
const closeExportModal = () => {
  showExportModal.value = false;
};

// 打开/关闭 导入 模态框
const openImportModal = () => {
  importMsg.value = '';
  importStatus.value = '';
  showImportModal.value = true;
};
const closeImportModal = () => {
  showImportModal.value = false;
};

// ------------- 导出逻辑 ---------------
const handleExport = async () => {
  exportMsg.value = '正在导出，请稍候...';
  exportStatus.value = '';
  try {
    // 触发 IPC，后端会返回 { success, message, archivePath }
    const result = await window.electronAPI.exportData();
    if (result.success) {
      archivePath = result.archivePath;
      exportMsg.value = `✔ 导出成功！`;
      exportStatus.value = 'success';
    } else {
      exportMsg.value = `✖ 导出失败：${result.message}`;
      exportStatus.value = 'error';
    }
  } catch (err) {
    console.error('导出异常：', err);
    exportMsg.value = `✖ 导出异常：${err.message}`;
    exportStatus.value = 'error';
  }
};

// 打开 .spacerval 所在文件夹
const openArchiveFolder = () => {
  if (archivePath) {
    // 打开“文件管理器”，并选中该文件
    window.electronAPI.showInFolder(archivePath);
  }
};

// ------------- 导入逻辑 ---------------
const handleImport = async () => {
  importMsg.value = '正在导入，请稍候...';
  importStatus.value = '';
  try {
    // 触发 IPC，后端会返回 { success, message }
    const result = await window.electronAPI.importData();
    if (result.success) {
      importMsg.value = '✔ 导入成功！';
      importStatus.value = 'success';
    } else {
      importMsg.value = `✖ 导入失败：${result.message}`;
      importStatus.value = 'error';
    }
  } catch (err) {
    console.error('导入异常：', err);
    importMsg.value = `✖ 导入异常：${err.message}`;
    importStatus.value = 'error';
  }
};
</script>

<style>
/* =============================================
   全局与布局样式
   ============================================= */
html,
body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.app-container.dark {
  background: #1e293b;
  color: #f1f5f9;
}

/* 右上角悬停菜单触发区域 */
.theme-menu-trigger {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 80px;
  height: 80px;
  z-index: 100;
}

/* 悬浮菜单 */
.theme-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.2s ease;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-menu.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
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

/* 深色模式下菜单样式 */
.dark .theme-menu {
  background: #1e293b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark .theme-toggle,
.dark .menu-action {
  color: white;
}

.dark .theme-toggle:hover,
.dark .menu-action:hover {
  background: #334155;
}

/* 主内容区 */
.main-content {
  width: 100%;
  height: 100%;
}

/* =============================================
   模态框样式
   ============================================= */
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
  position: relative;
}

.dark .modal-box {
  background: #334155;
  color: white;
}

.modal-title {
  margin: 0 0 12px;
  font-size: 18px;
}

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

/* 导出/导入 结果反馈 */
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

/* “打开压缩包所在文件夹” 链接样式 */
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
</style>

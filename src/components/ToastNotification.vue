<template>
  <div 
    class="toast-container" 
    v-if="toasts.length > 0"
    :class="[position, { dark: isDarkMode }]"
  >
    <div
      v-for="(toast, index) in toasts"
      :key="toast.id"
      class="toast"
      :class="{
        'toast-success': toast.type === 'success',
        'toast-error': toast.type === 'error',
        'toast-warning': toast.type === 'warning',
        'toast-info': toast.type === 'info',
        'leaving': toast.leaving
      }"
      :style="{
        animationDelay: `${index * 0.1}s`
      }"
    >
      <div class="toast-content">
        <div class="toast-icon" v-if="toast.type">
          <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="18" />
          </svg>
          <svg v-else-if="toast.type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <svg v-else-if="toast.type === 'info'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div class="toast-text">{{ toast.message }}</div>
        <button class="toast-close" @click="removeToast(toast.id)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, inject } from 'vue';

// 注入主题模式
const isDarkMode = inject('isDarkMode', ref(false));

// 定义toast类型
const toastTypes = ['success', 'error', 'warning', 'info'];

// 定义props
const props = defineProps({
  position: {
    type: String,
    default: 'bottom-right',
    validator: (value) => {
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(value);
    }
  },
  duration: {
    type: Number,
    default: 4000,
    validator: (value) => {
      return value >= 1000;
    }
  }
});

// 定义emits
const emit = defineEmits(['toast-closed']);

// toast队列
const toasts = ref([]);
let toastId = 0;

// 添加toast
const addToast = (message, type = 'info') => {
  // 验证类型
  if (!toastTypes.includes(type)) {
    type = 'info';
  }
  
  // 创建toast对象
  const toast = {
    id: toastId++,
    message,
    type,
    createdAt: Date.now(),
    leaving: false
  };
  
  // 添加到队列
  toasts.value.push(toast);
  
  // 设置自动移除定时器
  setTimeout(() => {
    removeToast(toast.id);
  }, props.duration);
  
  return toast.id;
};

// 移除toast
const removeToast = (id) => {
  const index = toasts.value.findIndex(toast => toast.id === id);
  if (index !== -1) {
    // 触发离开动画
    const toast = toasts.value[index];
    toast.leaving = true;
    
    // 等待动画完成后移除
    setTimeout(() => {
      toasts.value.splice(index, 1);
      emit('toast-closed', id);
    }, 300);
  }
};

// 清空所有toast
const clearAllToasts = () => {
  toasts.value.forEach(toast => {
    removeToast(toast.id);
  });
};

// 点击屏幕任意位置关闭所有toast
const handleClickOutside = (event) => {
  // 检查点击是否来自通知容器内部，如果是则不关闭
  const toastContainer = event.target.closest('.toast-container');
  if (toastContainer) return;
  
  // 简化逻辑：只有当点击事件的目标是document.body时，才关闭所有通知
  // 这样可以确保点击任何元素都不会立即关闭通知
  if (event.target === document.body) {
    clearAllToasts();
  }
};

// 生命周期钩子
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// 暴露方法给父组件
defineExpose({
  addToast,
  removeToast,
  clearAllToasts
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 99999;
  max-width: 320px;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
}

/* 位置样式 */
.toast-container {
  position: fixed;
  bottom: 0;
  right: 0;
}

.toast-container.top-left {
  position: fixed;
  top: 0;
  left: 0;
  bottom: auto;
  right: auto;
}

.toast-container.top-right {
  position: fixed;
  top: 0;
  right: 0;
  bottom: auto;
  left: auto;
}

.toast-container.bottom-left {
  position: fixed;
  bottom: 0;
  left: 0;
  right: auto;
  top: auto;
}

.toast-container.bottom-right {
  position: fixed;
  bottom: 0;
  right: 0;
  top: auto;
  left: auto;
}

.toast {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: toastSlideIn 0.3s ease-out forwards, toastFadeIn 0.3s ease-out forwards;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.toast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  border-radius: 4px 0 0 4px;
}

/* 类型样式 */
.toast-success {
  border-left: 4px solid #10b981;
}

.toast-success .toast-icon svg {
  color: #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-error .toast-icon svg {
  color: #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}

.toast-warning .toast-icon svg {
  color: #f59e0b;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-info .toast-icon svg {
  color: #3b82f6;
}

/* 内容样式 */
.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-text {
  flex: 1;
  font-size: 0.95rem;
  color: #374151;
  line-height: 1.4;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #9ca3af;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

/* 动画 */
@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 离开动画 */
.toast.leaving {
  animation: toastSlideOut 0.3s ease-in forwards, toastFadeOut 0.3s ease-in forwards;
}

@keyframes toastSlideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes toastFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 暗色主题 */
.dark .toast {
  background: #1f2937;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.dark .toast-text {
  color: #f3f4f6;
}

.dark .toast-close {
  color: #9ca3af;
}

.dark .toast-close:hover {
  background: #374151;
  color: #f3f4f6;
}
</style>
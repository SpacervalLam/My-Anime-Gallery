<template>
  <transition name="modal-fade">
    <div v-if="isVisible" class="settings-modal" :class="{ 'dark-mode': isDarkMode }">
      <div class="modal-overlay" @click.self="close"></div>
      <div class="modal-content" :class="{ 'dark-mode': isDarkMode }">
        <div class="modal-header">
          <h2 class="modal-title">{{ $t('settings') }}</h2>
          <button class="close-btn" @click="close">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="setting-items">
          <div class="setting-item">
            <div class="setting-header">
              <label for="theme">{{ $t('theme') }}</label>
              <span class="value-indicator">{{ themeLabel }}</span>
            </div>
            <div class="theme-options">
              <button 
                @click="setTheme('light')" 
                :class="['theme-btn', { active: theme === 'light' }]">
                ☀️ {{ $t('lightMode') }}
              </button>
              <button 
                @click="setTheme('dark')" 
                :class="['theme-btn', { active: theme === 'dark' }]">
                🌙 {{ $t('darkMode') }}
              </button>
              <button 
                @click="setTheme('system')" 
                :class="['theme-btn', { active: theme === 'system' }]">
                💻 {{ $t('followSystem') }}
              </button>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="volume">{{ $t('volume') }}</label>
              <span class="value-indicator">{{ volume }}%</span>
            </div>
            <input 
              id="volume" 
              type="range" 
              v-model="volume" 
              min="0" 
              max="100" 
              class="custom-slider"
            />
          </div>
          
          <div class="setting-item">
            <div class="setting-header">
              <label for="language">{{ $t('language') }}</label>
            </div>
            <div class="custom-select">
              <select id="language" v-model="language">
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="jp">日本語</option>
              </select>
              <div class="select-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn secondary" @click="close">{{ $t('cancel') }}</button>
          <button class="btn primary" @click="saveSettings">{{ $t('save') }}</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, inject, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { currentLanguage } from '../main.js'

const { t } = useI18n()

// 注入 Toast 函数
const showToast = inject('showToast')

const isVisible = ref(false)
const volume = ref(50)
const language = ref('en')
const theme = ref('system')

const isDarkMode = inject('isDarkMode')

let mediaQuery = null

const themeLabel = computed(() => {
  if (theme.value === 'light') return t('lightMode')
  if (theme.value === 'dark') return t('darkMode')
  return t('followSystem')
})

const open = () => {
  const savedTheme = localStorage.getItem('theme') || 'system'
  theme.value = savedTheme
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
}

const setTheme = (newTheme) => {
  theme.value = newTheme
  if (newTheme === 'system') {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDarkMode.value = true
      document.documentElement.classList.add('dark')
      showToast('已切换至深色模式', 'success')
    } else {
      isDarkMode.value = false
      document.documentElement.classList.remove('dark')
      showToast('已切换至浅色模式', 'success')
    }
  } else if (newTheme === 'dark') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
    showToast('已切换至深色模式', 'success')
  } else {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark')
    showToast('已切换至浅色模式', 'success')
  }
}

const saveSettings = () => {
  console.log('Settings saved:', {
    volume: volume.value,
    language: language.value,
    theme: theme.value
  })
  localStorage.setItem('theme', theme.value)
  localStorage.setItem('volume', volume.value)
  localStorage.setItem('language', language.value)
  currentLanguage.value = language.value
  showToast('设置保存成功', 'success')
  close()
}

// 监听音量变化
let volumeTimeout = null
watch(volume, (newVolume) => {
  if (isVisible.value) {
    // 清除之前的定时器
    if (volumeTimeout) {
      clearTimeout(volumeTimeout)
    }
    // 延迟显示Toast，避免频繁触发
    volumeTimeout = setTimeout(() => {
      showToast(`音量已调整为 ${newVolume}%`, 'info')
    }, 300)
  }
})

// 监听语言变化
let languageTimeout = null
watch(language, (newLanguage) => {
  if (isVisible.value) {
    // 清除之前的定时器
    if (languageTimeout) {
      clearTimeout(languageTimeout)
    }
    // 延迟显示Toast，避免频繁触发
    languageTimeout = setTimeout(() => {
      showToast('语言已切换', 'success')
    }, 300)
  }
})

const handleSystemThemeChange = (e) => {
  if (theme.value === 'system') {
    isDarkMode.value = e.matches
    document.documentElement.classList.toggle('dark', e.matches)
  }
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', handleSystemThemeChange)
  
  // 初始化设置
  const savedVolume = localStorage.getItem('volume')
  const savedLanguage = localStorage.getItem('language')
  if (savedVolume) {
    volume.value = parseInt(savedVolume)
  }
  if (savedLanguage) {
    language.value = savedLanguage
  }
})

onUnmounted(() => {
  if (mediaQuery) {
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }
})

defineExpose({
  open,
  close
})
</script>

<style scoped>
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6); 
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4); 
}

.modal-content {
  position: relative;
  z-index: 1001; 
  background-color: #ffffff; 
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
  animation: fadeIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.setting-item label {
  font-size: 1rem;
  color: #555;
}

.value-indicator {
  font-size: 0.9rem;
  color: #007bff;
  background: rgba(0, 123, 255, 0.1);
  padding: 4px 8px;
  border-radius: 12px;
}

.custom-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #007bff 0%, #007bff calc(var(--volume-percent, 50%) * 1%), #e0e0e0 calc(var(--volume-percent, 50%) * 1%), #e0e0e0 100%);
  outline: none;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
  transition: transform 0.2s;
}

.custom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.custom-select {
  position: relative;
}

.custom-select select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: #fff url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Cpath d="M6 9l6 6 6-6"%3E%3C/path%3E%3C/svg%3E') no-repeat right 12px center;
  background-size: 16px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  appearance: none; 
}

.custom-select select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}

.select-arrow {
  display: none; 
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn.primary {
  background: #007bff;
  color: #fff;
  border: none;
}

.btn.primary:hover {
  background: #0056b3;
}

.btn.secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ccc;
}

.btn.secondary:hover {
  background: #e2e6ea;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.theme-btn:hover {
  background: #f0f0f0;
  border-color: #007bff;
}

.theme-btn.active {
  background: #007bff;
  color: #fff;
  border-color: #007bff;
}

.dark-mode .settings-modal {
  background: rgba(30, 41, 59, 0.95);
}

.dark-mode .modal-content {
  background: #1e293b;
  color: #f1f5f9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.dark-mode .modal-title {
  color: #f1f5f9;
}

.dark-mode .close-btn {
  color: #cbd5e1;
}

.dark-mode .close-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.1);
}

.dark-mode .setting-header label {
  color: #cbd5e1;
}

.dark-mode .value-indicator {
  background: rgba(59, 130, 246, 0.2);
  color: #f1f5f9;
}

.dark-mode .custom-slider {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%);
}

.dark-mode .custom-slider::-webkit-slider-thumb {
  background: #60a5fa;
}

.dark-mode .custom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.dark-mode .custom-select {
  background: #1e293b;
  color: #f1f5f9;
}

.dark-mode .custom-select select {
  background: #1e293b url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="2"%3E%3Cpath d="M6 9l6 6 6-6"%3E%3C/path%3E%3C/svg%3E') no-repeat right 12px center;
  background-size: 16px;
  color: #f1f5f9;
  border: 1px solid #334155;
}

.dark-mode .custom-select select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.dark-mode .theme-btn {
  background: #1e293b;
  color: #f1f5f9;
  border-color: #334155;
}

.dark-mode .theme-btn:hover {
  background: #334155;
  border-color: #3b82f6;
}

.dark-mode .theme-btn.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.dark-mode .btn {
  background: #3b82f6;
  color: #f1f5f9;
  border: 1px solid #334155;
}

.dark-mode .btn.primary:hover {
  background: #2563eb;
}

.dark-mode .btn.secondary {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
}

.dark-mode .btn.secondary:hover {
  background: #334155;
}

/* 过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from .modal-content {
  transform: scale(0.95);
  opacity: 0;
}

.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>
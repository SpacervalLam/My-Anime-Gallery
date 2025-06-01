<template>
  <transition name="modal-fade">
    <div v-if="isVisible" class="settings-modal">
      <div class="modal-overlay" @click.self="close"></div>
      <div class="modal-content">
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
            <label for="language">{{ $t('language') }}</label>
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
import { ref } from 'vue'
import { currentLanguage } from '../main.js';

const isVisible = ref(false)
const volume = ref(50)
const language = ref('en')

const open = () => {
  isVisible.value = true
}

const close = () => {
  isVisible.value = false
}

const saveSettings = () => {
  console.log('Settings saved:', {
    volume: volume.value,
    language: language.value
  });
  currentLanguage.value = language.value; // 更新全局语言
  close()
}

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
  backdrop-filter: blur(2px); 
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
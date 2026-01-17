<template>
  <div v-if="show" class="ai-config-overlay" @click.self="close">
    <div class="ai-config-modal" :class="{ 'dark': isDarkMode }" @click.stop>
      <div class="modal-header">
        <h2>{{ $t('aiConfig') }}</h2>
      </div>
      
      <div class="modal-body">
        <div class="config-section">
          <h3>{{ $t('apiSettings') }}</h3>
          
          <div class="form-group">
            <label>{{ $t('apiProvider') }}</label>
            <select v-model="config.provider" class="form-select">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="baidu">百度千帆大模型</option>
              <option value="doubao">火山引擎豆包</option>
              <option value="custom">{{ $t('custom') }}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>{{ $t('apiEndpoint') }}</label>
            <input 
              v-model="config.endpoint" 
              type="url" 
              :placeholder="getDefaultEndpoint()"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>{{ $t('apiKey') }}</label>
            <div class="input-with-toggle">
            <input 
              v-model="config.apiKey" 
              :type="showApiKey ? 'text' : 'password'"
              :placeholder="$t('enterApiKey')"
              class="form-input"
            />
            <button class="toggle-btn" :class="{ active: showApiKey }" @click="showApiKey = !showApiKey">
              <svg v-if="showApiKey" class="eye-icon open" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else class="eye-icon closed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
              </svg>
            </button>
          </div>
          </div>
          
          <div class="form-group">
            <label>{{ $t('modelName') }}</label>
            <input 
              v-model="config.model" 
              :placeholder="getDefaultModel()"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="config-section">
          <h3>{{ $t('advancedSettings') }}</h3>
          
          <div class="form-group">
            <label>{{ $t('temperature') }}</label>
            <input 
              v-model.number="config.temperature" 
              type="number" 
              min="0" 
              max="2" 
              step="0.1"
              class="form-input"
            />
            <span class="hint">{{ $t('temperatureHint') }}</span>
          </div>
          
          <div class="form-group">
            <label>{{ $t('maxTokens') }}</label>
            <input 
              v-model.number="config.maxTokens" 
              type="number" 
              min="100" 
              max="4000"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="config-section">
          <h3>{{ $t('proxySettings') }}</h3>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="config.useProxy" 
                type="checkbox" 
                class="form-checkbox"
              />
              {{ $t('enableProxy') }}
            </label>
          </div>
          
          <template v-if="config.useProxy">
            <div class="form-group">
              <label>{{ $t('proxyType') }}</label>
              <select v-model="config.proxyType" class="form-select">
                <option value="http">HTTP Proxy</option>
                <option value="socks5">SOCKS5 Proxy</option>
              </select>
              <span class="hint">{{ $t('proxyTypeHint') }}</span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label>{{ $t('proxyHost') }}</label>
                <input 
                  v-model="config.proxyHost" 
                  type="text" 
                  placeholder="127.0.0.1"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label>{{ $t('proxyPort') }}</label>
                <input 
                  v-model.number="config.proxyPort" 
                  type="number" 
                  min="1" 
                  max="65535"
                  placeholder="7890"
                  class="form-input"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  v-model="config.proxyAuth" 
                  type="checkbox" 
                  class="form-checkbox"
                />
                {{ $t('enableProxyAuth') }}
              </label>
            </div>
            
            <template v-if="config.proxyAuth">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                  <label>{{ $t('proxyUsername') }}</label>
                  <input 
                    v-model="config.proxyUsername" 
                    type="text" 
                    class="form-input"
                  />
                </div>
                
                <div class="form-group">
                  <label>{{ $t('proxyPassword') }}</label>
                  <input 
                    v-model="config.proxyPassword" 
                    type="password" 
                    class="form-input"
                  />
                </div>
              </div>
            </template>
            
            <div class="form-group">
              <button 
                type="button" 
                @click="testProxyConnection" 
                class="btn btn-secondary"
                :disabled="testingProxy"
              >
                <span v-if="testingProxy" class="spinner-small"></span>
                <span v-else>{{ $t('testProxy') }}</span>
              </button>
            </div>
          </template>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-cancel" @click="close">
          {{ $t('cancel') }}
        </button>
        <button class="btn btn-save" @click="save" :disabled="saving">
          <span v-if="saving" class="spinner"></span>
          <span v-else>{{ $t('save') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject } from 'vue';
import { useI18n } from 'vue-i18n';

const show = defineModel('show', { type: Boolean, default: false });
const emit = defineEmits(['close']);

const { t } = useI18n();
const isDarkMode = inject('isDarkMode');
const showToast = inject('showToast');

const showApiKey = ref(false);
const saving = ref(false);
const testingProxy = ref(false);

const config = ref({
  provider: 'openai',
  endpoint: '',
  apiKey: '',
  model: '',
  temperature: 0.7,
  maxTokens: 2000,
  useProxy: false,
  proxyType: 'http',
  proxyHost: '',
  proxyPort: null,
  proxyAuth: false,
  proxyUsername: '',
  proxyPassword: ''
});

const getDefaultEndpoint = () => {
  const endpoints = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    baidu: 'https://qianfan.baidubce.com/v2/chat/completions',
    doubao: 'https://ark.cn-beijing.volces.com/api/v3/responses'
  };
  return endpoints[config.value.provider] || '';
};

const getDefaultModel = () => {
  const models = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
    gemini: 'gemini-pro',
    baidu: 'qwen3-14b',
    doubao: 'doubao-seed-1-6-250615'
  };
  return models[config.value.provider] || '';
};

const loadConfig = async () => {
  try {
    const saved = await window.electronAPI.loadAIConfig();
    if (saved) {
      config.value = saved;
    }
  } catch (e) {
    console.error('加载AI配置失败:', e);
  }
};

const saveConfig = async () => {
  try {
    // 验证并处理数值字段，确保它们不是NaN
    const configToSave = {
      ...config.value,
      temperature: isNaN(config.value.temperature) ? 0.7 : config.value.temperature,
      maxTokens: isNaN(config.value.maxTokens) ? 2000 : config.value.maxTokens,
      proxyPort: config.value.proxyPort === null || isNaN(config.value.proxyPort) ? null : config.value.proxyPort
    };
    await window.electronAPI.saveAIConfig(configToSave);
  } catch (e) {
    console.error('保存AI配置失败:', e);
    throw e;
  }
};

const open = async () => {
  await loadConfig();
  show.value = true;
};

const close = () => {
  show.value = false;
  emit('close');
};

// 测试代理连接状态
const testProxyConnection = async () => {
  if (!config.value.proxyHost || !config.value.proxyPort) {
    showToast(t('proxyHostPortRequired'), 'warning');
    return;
  }
  
  testingProxy.value = true;
  
  try {
    // 构建代理测试请求
    const proxyConfig = {
      useProxy: config.value.useProxy,
      proxyType: config.value.proxyType,
      proxyHost: config.value.proxyHost,
      proxyPort: config.value.proxyPort,
      proxyAuth: config.value.proxyAuth,
      proxyUsername: config.value.proxyUsername,
      proxyPassword: config.value.proxyPassword
    };
    
    // 通过Electron主进程测试代理连接
    const result = await window.electronAPI.testProxyConnection(proxyConfig);
    
    showToast(t('proxyTestSuccess'), 'success');
  } catch (error) {
    // 处理不同类型的错误，确保用户能看到清晰的错误信息
    let errorMessage = error.message || t('unknownError');
    
    // 解析错误信息，提取有用部分
    if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = t('proxyConnectionRefused');
    } else if (errorMessage.includes('ETIMEDOUT')) {
      errorMessage = t('proxyConnectionTimeout');
    } else if (errorMessage.includes('ERR_PROXY_CONNECTION_FAILED')) {
      errorMessage = t('proxyConnectionFailed');
    } else if (errorMessage.includes('AbortError')) {
      errorMessage = t('proxyConnectionTimeout');
    }
    
    showToast(t('proxyTestFailed') + ': ' + errorMessage, 'error');
    console.error('代理测试失败:', error);
  } finally {
    testingProxy.value = false;
  }
};

const save = async () => {
  saving.value = true;
  try {
    await saveConfig();
    showToast(t('aiConfigSaveSuccess'), 'success');
    close();
  } catch (error) {
    console.error('保存AI配置失败:', error);
    showToast(t('saveFailed') + ', ' + t('pleaseRetry'), 'error');
  } finally {
    saving.value = false;
  }
};

watch(() => config.value.provider, (newProvider, oldProvider) => {
  if (newProvider !== oldProvider) {
    config.value.endpoint = getDefaultEndpoint();
    // 只有当模型名称为空时才设置默认值，避免覆盖用户保存的模型名称
    if (!config.value.model) {
      config.value.model = getDefaultModel();
    }
  }
});

// 监听show属性变化，当显示时自动加载配置
watch(show, async (newValue) => {
  if (newValue) {
    await loadConfig();
  }
});

defineExpose({
  open
});
</script>

<style scoped>
.ai-config-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.ai-config-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 75px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.93);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px 16px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1a1a1a;
  font-weight: 700;
  text-align: center;
}

.modal-body {
  padding: 24px;
  max-height: calc(90vh - 180px);
  overflow-y: auto;
  background: white;
}

.config-section {
  margin-bottom: 28px;
  padding: 20px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.config-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.config-section h3 {
  margin: 0 0 16px;
  font-size: 1.15rem;
  color: #1a1a1a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-section h3::before {
  content: '';
  width: 4px;
  height: 18px;
  background: #3b82f6;
  border-radius: 2px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #4a5568;
  font-size: 0.95rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #4a5568;
  font-size: 0.95rem;
  user-select: none;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-checkbox:hover {
  transform: scale(1.1);
}

.form-checkbox:checked {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-with-toggle {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.input-with-toggle .form-input {
  flex: 1;
}

.toggle-btn {
  padding: 12px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-width: 48px;
}

.toggle-btn:hover {
  background: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.eye-icon {
  transition: all 0.2s ease;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.eye-icon:hover {
  color: #3b82f6;
  transform: scale(1.1);
}

.eye-icon.open,
.eye-icon.closed {
  transform: scale(1);
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 0.85rem;
  color: #6b7280;
  line-height: 1.4;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 0 0 16px 16px;
}

.btn {
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.btn-save {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
}
  
.btn-secondary {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
}
  
.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}
  
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
  
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
  
.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
  
.proxy-test-result {
  margin-left: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}
  
.proxy-test-result.success {
  color: #10b981;
}
  
.proxy-test-result.error {
  color: #ef4444;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dark {
  background: #1e293b;
  box-shadow: 0 25px 75px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .modal-header {
  border-bottom-color: #334155;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.dark .modal-header h2 {
  color: #f1f5f9;
}

.dark .modal-body {
  background: #1e293b;
}

.dark .config-section {
  background: #0f172a;
  border-color: #334155;
}

.dark .config-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dark .config-section h3 {
  color: #f1f5f9;
}

.dark .config-section h3::before {
  background: #60a5fa;
}

.dark .form-group label {
  color: #cbd5e1;
}

.dark .form-input,
.dark .form-select,
.dark .form-textarea {
  background: #0f172a;
  border-color: #334155;
  color: #f1f5f9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.dark .form-input:focus,
.dark .form-select:focus,
.dark .form-textarea:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2), 0 1px 3px rgba(0, 0, 0, 0.2);
}

.dark .toggle-btn {
  background: #0f172a;
  border-color: #334155;
  color: #cbd5e1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.dark .toggle-btn:hover {
  background: #334155;
  border-color: #475569;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.dark .eye-icon {
  color: #cbd5e1;
}

.dark .eye-icon:hover {
  color: #60a5fa;
}

.dark .checkbox-label {
  color: #cbd5e1;
}

.dark .form-checkbox {
  accent-color: #60a5fa;
}

.dark .form-checkbox:checked {
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

.dark .hint {
  color: #94a3b8;
}

/* Grid layout styles */
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dark .modal-footer {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-top-color: #334155;
}

.dark .btn-cancel {
  background: #1e293b;
  color: #cbd5e1;
  border-color: #334155;
}

.dark .btn-cancel:hover {
  background: #334155;
  border-color: #475569;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
</style>

<template>
  <div class="w-full px-4 py-5">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
      <!-- Gallery Preview - 左侧预览区 -->
      <div
        class="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100">
        <!-- 封面预览区域 -->
        <div class="relative aspect-[2/1] bg-gradient-to-br from-gray-50 to-gray-100">
          <template v-if="previewImageUrl">
            <img :src="previewImageUrl" class="absolute inset-0 w-full h-full object-cover" />
          </template>
          <template v-else>
            <!-- 默认SVG封面 -->
            <svg class="absolute inset-0 w-full h-full object-cover" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#E2E8F0" />
                  <stop offset="100%" style="stop-color:#CBD5E1" />
                </linearGradient>
              </defs>
              
              <rect width="400" height="200" rx="16" fill="url(#bgGrad)"/>
              
              <text x="200" y="100" text-anchor="middle" fill="white" font-family="sans-serif" font-size="14" letter-spacing="2" opacity="0.9">NO CONTENT AVAILABLE</text>
            </svg>
          </template>
        </div>

        <!-- 预览信息 -->
        <div class="p-3">
          <h3 class="text-lg font-semibold mb-1">{{ title || $t('title') }}</h3>

          <div v-if="showEscHint" class="text-xs text-indigo-500 bg-indigo-50 rounded py-1 px-2 mb-2 inline-block">
            {{ $t('pressEscToExit') }}
          </div>

          <!-- 其他标题 -->
          <div v-if="altTitles.length > 0" class="mb-2 space-y-1">
            <div v-for="(altTitle, idx) in altTitles" :key="idx" class="flex items-center">
              <span class="text-xs text-gray-600 flex-1">{{ altTitle }}</span>
              <button type="button" @click.stop="removeAltTitle(idx)" class="text-gray-400 hover:text-red-500 text-sm">
                ×
              </button>
            </div>
          </div>

          <!-- 标签 -->
          <div v-if="tags.length" class="flex flex-wrap gap-1.5 mb-2">
            <span v-for="(tag, idx) in tags" :key="idx"
              :class="`px-2 py-0.5 ${tagColors[tag] || getRandomLightColor(tag)} rounded-full text-xs font-medium`">
              {{ tag }}
            </span>
          </div>

          <!-- 链接 -->
          <div v-if="links.length" class="space-y-1.5">
            <div v-for="(link, idx) in links" :key="idx"
              class="text-xs text-blue-600 truncate hover:underline flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <a :href="link.url" target="_blank" class="truncate">{{ link.name || '链接' }}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Form - 右侧表单区 -->
      <form @submit.prevent="onSubmit"
        class="w-full space-y-5 bg-white p-5 rounded-xl shadow-lg border border-gray-100">
        <!-- 主标题输入 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('title') }}</label>
          <div class="flex gap-2">
            <input v-model="title" required
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              :placeholder="$t('title')" ref="titleInput" />
            <button type="button" @click="handleAIFill"
            class="px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition text-sm flex items-center gap-1"
            :disabled="isAIFilling">
            <span v-if="!isAIFilling">{{ $t('aiComplete') }}</span>
            <span v-else class="spinner-small"></span>
          </button>
          </div>

          <!-- 更多标题引导标签 -->
          <div class="mt-1">
            <button type="button" @click="showAltTitleInput = true" class="text-indigo-600 hover:text-indigo-800 text-xs font-medium transition-colors">
              {{ $t('moreTitles') }}
            </button>
          </div>

          <!-- 其他标题输入框 -->
          <div v-if="showAltTitleInput" class="mt-2">
            <input v-model="newAltTitle" @keydown.enter.prevent="addAltTitle"
              class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              :placeholder="$t('addAltTitleHint')" />
          </div>
        </div>

        <!-- 标签管理 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('tagCategory') }}</label>
          <div class="flex items-center flex-wrap gap-2">
            <input v-model="newTag" @keydown.enter.prevent="addTag"
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              :placeholder="$t('addTagHint')" />
          </div>

          <!-- 标签选择区域 -->
          <div class="mt-2">
            <p class="text-xs text-gray-500 mb-1">{{ $t('recommendedTags') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" v-for="tag in filteredAllTags" :key="tag" @click.stop="addExistingTag(tag)"
                class="px-2.5 py-0.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 rounded-full text-xs transition border border-gray-200">
                {{ tag }}
              </button>
            </div>

            <p class="text-xs text-gray-500 mt-2 mb-1">{{ $t('selectedTags') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="(tag, idx) in tags" :key="idx"
                :class="`inline-flex items-center px-2.5 py-0.5 ${tagColors[tag] || getRandomLightColor(tag)} rounded-full text-xs font-medium`">
                {{ tag }}
                <button type="button" @click="removeTag(idx)" class="ml-1 text-gray-500 hover:text-gray-700 text-xs">
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- 链接管理 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('relatedLinks') }}</label>
          <div v-for="(link, idx) in links" :key="idx" class="flex gap-2 mb-2">
            <input v-model="link.name"
              class="w-1/3 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              :placeholder="$t('linkName')" />
            <input v-model="link.url" type="url"
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              :placeholder="$t('linkUrlHint')" />
            <button type="button" @click="removeLink(idx)" class="text-red-500 hover:text-red-700 transition p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

          </div>
          <button type="button" @click="addLink"
            class="text-indigo-600 hover:text-indigo-800 text-xs flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {{ $t('addLink') }}
          </button>
        </div>

        <!-- 封面和背景音乐 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 封面图片选择 -->
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('coverImageLabel') }}</label>
            <button type="button" @click="selectImage"
              class="w-full px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ previewImageUrl ? $t('rechooseImage') : $t('chooseCoverImage') }}</span>
            </button>
          </div>

          <!-- 背景音乐选择 -->
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('backgroundMusicLabel') }}</label>
            <button type="button" @click="selectMusic"
              class="w-full px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>{{ musicPath ? $t('rechooseMusic') : $t('chooseBackgroundMusic') }}</span>
            </button>
            <div v-if="musicPath" class="mt-1 text-xs text-gray-600 truncate px-1">
              {{ $t('selectedLabel') }} {{ musicPath }}
            </div>
          </div>
        </div>

        <!-- 图片裁剪区域 -->
        <div v-if="previewImageUrl" class="mt-2 space-y-3">
          <div class="relative aspect-[2/1] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <img ref="cropperImgRef" :src="cropperImageUrl" class="w-full h-full object-contain" @load="initCropper" />
          </div>

          <div class="flex gap-2">
            <button type="button" @click="cropImage"
              class="flex-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ $t('applyCrop') }}
            </button>
            <button type="button" @click="resetCropper"
              class="flex-1 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {{ $t('resetCrop') }}
            </button>
          </div>
        </div>

        <!-- 简介输入 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">{{ $t('descriptionLabel') }}</label>
          <textarea v-model="description" rows="3"
            class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            :placeholder="$t('animeDescription')"></textarea>
        </div>

        <!-- 表单提交按钮 -->
        <div class="pt-3 flex gap-2">
          <button type="submit"
            class="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
            <svg v-if="formState.isEditing" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {{ formState.isEditing ? $t('updateEntry') : $t('saveEntry') }}
          </button>
          <button v-if="formState.isEditing" type="button" @click="cancelEdit"
            class="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 transition text-sm flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {{ $t('cancel') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch, inject } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

// 注入 showToast 函数
const showToast = inject('showToast');

const allTags = ref([]);
const filteredAllTags = computed(() => {
  return allTags.value.filter(tag => !tags.value.includes(tag));
});

// async function loadAllTags() {
//   const tags = await window.electronAPI.getAllTags();
//   allTags.value = tags;
// }

const currentId = ref(null);
const title = ref('');
const altTitles = ref([]);
const showAltTitleInput = ref(false);
const newAltTitle = ref('');
const tags = ref([]);
const newTag = ref('');
const links = ref([]);
const showEscHint = ref(true);
const previewImageUrl = ref(null);
const cropperImageUrl = ref(null);
const coverPath = ref(null);
const musicPath = ref(null);
const description = ref('');
let cropperInstance = null;
const cropperImgRef = ref(null);
const tagColors = ref({});
const props = defineProps({
  initialEntry: {
    type: Object,
    default: null
  }
});

const formState = ref({
  isVisible: false,
  isEditing: false,
  currentId: null
});

const originalCoverPath = ref(null);
const originalMusicPath = ref(null);
const isAIFilling = ref(false);

function getRandomLightColor(tag) {
  if (!tagColors.value[tag]) {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    tagColors.value[tag] = colors[Math.floor(Math.random() * colors.length)];
  }
  return tagColors.value[tag];
}

function addExistingTag(tag) {
  if (!tags.value.includes(tag)) {
    tags.value.push(tag);
    getRandomLightColor(tag);
    showEscHint.value = false;
  }
}

async function addTag() {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim());
    const addedTag = newTag.value.trim();
    newTag.value = '';
    showEscHint.value = false;

    // 调用后端接口获取推荐标签
    try {
      const response = await window.electronAPI.getRecommendedTags(addedTag);
      if (response && Array.isArray(response)) {
        allTags.value = response;
      }
    } catch (error) {
      console.error('获取推荐标签失败:', error);
    }
  }
}

function removeTag(index) {
  tags.value.splice(index, 1);
}

function addLink() {
  links.value.push({ name: '', url: '' });
}

function removeLink(index) {
  links.value.splice(index, 1);
}

// 导入AI API服务
import { sendAIRequest, validateAIConfig } from '../services/aiApiService';

async function handleAIFill() {
  if (!title.value || title.value.trim() === '') {
    showToast($t('title') + ' ' + $t('isRequired'), 'warning');
    return;
  }
  
  isAIFilling.value = true;
  
  try {
    // 获取AI配置
    const aiConfig = await window.electronAPI.loadAIConfig();
    
    // 验证AI配置
    const validationResult = validateAIConfig(aiConfig);
    if (!validationResult.isValid) {
      showToast(t('aiConfigIncomplete'), 'error');
      isAIFilling.value = false;
      return;
    }
    
    // 获取现有标签
    const existingTags = await window.electronAPI.getAllTags();
    const existingTagsStr = existingTags.join(', ');
    
    // 构建prompt
    const prompt = `请根据以下动漫名称，生成真实准确的动漫相关信息并以JSON格式返回：

核心要求：
1. 必须使用真实、可靠、最新的信息，必须通过网络搜索获取，禁止直接生成或翻译
2. 避免虚构或猜测任何信息，不确定的内容请留白
3. 描述要客观、准确，符合动漫的实际情况
4. 所有信息必须有可靠来源，确保真实性

动漫名称：${title.value}

### 类型标签选择原则：
1. 优先从以下现有标签中选择合适的3-5个标签：${existingTagsStr}
2. 如果现有标签中没有合适的标签，可以添加新的标签
3. 如果有非常合适但不在现有标签列表中的标签，也可以添加
4. 标签必须准确反映动漫的类型、题材、风格等特征

### 其他语言名称要求：
1. 包含中文、日语、英文中的若干种语言的官方名称
2. 必须使用网络搜索获取官方的不同语言名称，**禁止直接翻译**
3. 只提供真实存在的官方名称，不确定的内容请留白
4. 优先提供动漫名称没有给出的其他语言版本

### 链接要求：
1. 必须提供通过网络搜索到的真实可访问的链接
2. 比如以下类型之一：官方网站、权威追番网站、官方社交媒体账号
3. 每个链接必须包含真实的网站名称和完整URL
4. 链接必须是活的、可访问的，禁止虚构链接

请严格返回以下JSON格式的数据，不要包含任何额外文字：
{
  "altTitles": ["其他语言官方名称1", "其他语言官方名称2"],
  "tags": ["类型标签1", "类型标签2", "类型标签3"],
  "description": "动漫简介，100-200字，必须真实准确",
  "links": [
    {
      "name": "网站真实名称",
      "url": "完整的真实URL"
    }
  ]
}`;
    
    // 发送AI请求，增加超时时间到60秒
    const aiResponse = await sendAIRequest(aiConfig, prompt, 60000);
    
    // 填充表单
    if (aiResponse.altTitles && Array.isArray(aiResponse.altTitles)) {
      altTitles.value = aiResponse.altTitles;
    }
    
    if (aiResponse.tags && Array.isArray(aiResponse.tags)) {
      aiResponse.tags.forEach(tag => {
        if (!tags.value.includes(tag)) {
          tags.value.push(tag);
          getRandomLightColor(tag);
        }
      });
    }
    
    if (aiResponse.description && typeof aiResponse.description === 'string') {
      description.value = aiResponse.description;
    }
    
    if (aiResponse.links && Array.isArray(aiResponse.links)) {
      links.value = aiResponse.links;
    }
    
    showEscHint.value = false;
    console.log('AI填写成功');
  } catch (error) {
    console.error('AI填写失败:', error);
    showToast(t('aiFillFailed') + ': ' + error.message, 'error');
  } finally {
    isAIFilling.value = false;
  }
}

watch(() => props.initialEntry, entry => {
  if (!entry) {
    resetForm();
    formState.value.isEditing = false;
    return;
  }
  console.log('[EntryForm] init form with', entry.id);
  originalCoverPath.value = entry.coverPath;
  originalMusicPath.value = entry.music || null;
  formState.value.isVisible = true;
  formState.value.isEditing = true;
  formState.value.currentId = entry.id;

  title.value = entry.title;
  altTitles.value = JSON.parse(entry.altTitles);
  tags.value = entry.tags ? JSON.parse(entry.tags) : [];
  links.value = entry.links ? JSON.parse(entry.links) : [];
  coverPath.value = entry.coverPath;
  musicPath.value = entry.music || null;
  description.value = entry.description || '';

  previewImageUrl.value = entry.coverPath;
  cropperImageUrl.value = entry.coverPath;
  nextTick(initCropper);
},
  { immediate: true }
);


// onMounted(() => {
//   loadAllTags();
//   window.addEventListener('tags-updated', loadAllTags);

//   // 统一使用 formState 管理状态
//   window.addEventListener('open-form', (e) => {
//     const isNew = e.detail?.isNew || false;
//     resetForm();
//     formState.value.isVisible = true;
//     formState.value.isEditing = !isNew;
//     formState.value.currentId = null;
//   });

//   window.addEventListener('edit-entry', async (e) => {
//     const entry = e.detail;

//     // 重置表单状态
//     resetForm();

//     // 设置表单状态
//     formState.value.isVisible = true;
//     formState.value.isEditing = true;
//     formState.value.currentId = entry.id;

//     // 填充表单数据
//     title.value = entry.title;
//     altTitles.value = JSON.parse(entry.altTitles);
//     tags.value = entry.tags ? JSON.parse(entry.tags) : [];
//     links.value = entry.links ? JSON.parse(entry.links) : [];
//     coverPath.value = entry.coverPath;
//     musicPath.value = entry.music || null;
//     description.value = entry.description || '';

//     if (formState.isEditing.value) {
//       showEscHint.value = false;
//     }

//     previewImageUrl.value = entry.coverPath;
//     cropperImageUrl.value = entry.coverPath;

//     await nextTick();
//     initCropper();
//   });
// });

function toggleAltTitleInput() {
  showAltTitleInput.value = true;
  nextTick(() => {
    document.querySelector('input[placeholder="添加其他标题，Enter提交"]').focus();
  });
}

function addAltTitle() {
  if (newAltTitle.value.trim()) {
    altTitles.value.push(newAltTitle.value.trim());
    newAltTitle.value = '';
    showEscHint.value = false;
  }
}

function removeAltTitle(index) {
  altTitles.value.splice(index, 1);
}

function cancelEdit() {
  formState.value.isEditing = false;
  resetForm();
}

function resetForm() {
  currentId.value = null;
  title.value = '';
  altTitles.value = [];
  tags.value = [];
  links.value = [];
  previewImageUrl.value = null;
  cropperImageUrl.value = null;
  coverPath.value = null;
  musicPath.value = null;
  description.value = '';
  showEscHint.value = true;

  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
}

async function selectImage() {
  const filePath = await window.electronAPI.openFile();
  if (filePath) {
    cropperImageUrl.value = filePath;
    previewImageUrl.value = filePath;
    coverPath.value = filePath;
    await nextTick();
    initCropper();
  }
}

async function selectMusic() {
  const filePath = await window.electronAPI.openMusic();
  if (!filePath) return;

  // 拷贝到 userData/music 并拿到新的路径
  const importedPath = await window.electronAPI.importMusic(filePath);
  musicPath.value = importedPath;
}

function initCropper() {
  if (cropperInstance) cropperInstance.destroy();
  cropperInstance = new Cropper(cropperImgRef.value, {
    aspectRatio: 2 / 1,
    viewMode: 0,
    autoCrop: true,
    autoCropArea: 1,
    contain: true
  });
  // 等下一次 DOM 更新周期再强制裁剪一次
  nextTick(() => {
    cropperInstance.crop();
  });
}


function resetCropper() {
  if (cropperInstance) {
    cropperInstance.reset();
  }
}

function cropImage() {
  return new Promise((resolve) => {
    if (!cropperInstance) {
      resolve(false);
      return;
    }

    const canvas = cropperInstance.getCroppedCanvas({ width: 800, height: 400 });
    if (canvas) {
      previewImageUrl.value = canvas.toDataURL('image/png');
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

async function onSubmit() {
  // 如果用户选择了封面图片，则进行裁剪和保存
  if (previewImageUrl.value) {
    if (cropperInstance) {
      const cropSuccess = await cropImage();
      if (!cropSuccess) {
        showToast(t('cropFailed'), 'warning');
        return;
      }
      coverPath.value = previewImageUrl.value;
    } else if (!previewImageUrl.value.startsWith('data:image')) {
      showToast(t('pleaseSelectImageOrCrop'), 'warning');
      return;
    }

    const filename = `${Date.now()}.png`;
    coverPath.value = await window.electronAPI.saveCropped({
      dataURL: previewImageUrl.value,
      filename
    });
  } else {
    // 如果用户没有选择封面图片，设置为空字符串，由后端或前端处理默认SVG
    coverPath.value = '';
  }

  const tagsToSave = tags.value && tags.value.length ? tags.value : [];

  const entry = {
    id: formState.value.currentId,
    title: title.value,
    altTitles: JSON.stringify(altTitles.value.filter(t => t)),
    tags: JSON.stringify(tagsToSave),
    links: JSON.stringify(links.value.filter(l => l.url)),
    coverPath: coverPath.value,
    music: musicPath.value,
    description: description.value.trim() || null
  };

  if (formState.value.isEditing) {
    // 如果替换了封面，就先删除原来的文件
    if (originalCoverPath.value && coverPath.value !== originalCoverPath.value) {
      await window.electronAPI.deleteFile(originalCoverPath.value);
    }
    // 如果替换了音乐，就先删除原来的文件
    if (originalMusicPath.value && musicPath.value !== originalMusicPath.value) {
      await window.electronAPI.deleteFile(originalMusicPath.value);
    }
    await window.electronAPI.updateEntry(entry);
    // 更新成功显示 Toast
    showToast(t('entryUpdatedSuccess'), 'success');
  } else {
    await window.electronAPI.saveEntry(entry);
    // 保存成功显示 Toast
    showToast(t('entrySavedSuccess'), 'success');
  }

  resetForm();
  formState.value.isEditing = false;
  window.dispatchEvent(new Event('entry-saved'));
  // 关闭模态框，防止显示空表单
  window.dispatchEvent(new Event('close-form'));
}
</script>

<style scoped>
.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin-small 0.8s linear infinite;
}

@keyframes spin-small {
  to {
    transform: rotate(360deg);
  }
}

/* 动画效果 */
button {
  transition: all 0.2s ease;
}

input,
textarea {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* 基础样式 */
.w-full {
  background: #f8fafc;
  transition: background 0.3s ease;
}

.dark .w-full {
  background: #0f172a;
}

.bg-white {
  background: white;
  transition: background 0.3s ease;
}

.dark .bg-white {
  background: #1e293b;
}

.border-gray-100 {
  border-color: #f3f4f6;
  transition: border-color 0.3s ease;
}

.dark .border-gray-100 {
  border-color: #334155;
}

.text-gray-700 {
  color: #374151;
  transition: color 0.3s ease;
}

.dark .text-gray-700 {
  color: #e2e8f0;
}

.text-gray-500 {
  color: #6b7280;
  transition: color 0.3s ease;
}

.dark .text-gray-500 {
  color: #94a3b8;
}

.bg-gray-100 {
  background: #f3f4f6;
  transition: background 0.3s ease;
}

.dark .bg-gray-100 {
  background: #1e293b;
}

/* 输入框样式 */
input, textarea {
  background: white;
  border-color: #e5e7eb;
  color: #111827;
  transition: all 0.3s ease;
}

.dark input,
.dark textarea {
  background: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

/* 按钮样式 */
.bg-indigo-500 {
  background: #6366f1;
  transition: background 0.3s ease;
}

.dark .bg-indigo-500 {
  background: #818cf8;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.dark ::-webkit-scrollbar-track {
  background: #1e293b;
}

::-webkit-scrollbar-thumb {
  background: #c5c5c5;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
  transition: background 0.3s ease;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* 预览区域 */
.bg-gradient-to-br {
  background: linear-gradient(to bottom right, #f9fafb, #f3f4f6);
  transition: background 0.3s ease;
}

.dark .bg-gradient-to-br {
  background: linear-gradient(to bottom right, #1e293b, #0f172a);
}

.text-gray-400 {
  color: #9ca3af;
  transition: color 0.3s ease;
}

.dark .text-gray-400 {
  color: #64748b;
}

/* 标签样式 */
.bg-blue-100 {
  background: #dbeafe;
  transition: background 0.3s ease;
}

.dark .bg-blue-100 {
  background: #1e40af;
}

.text-blue-800 {
  color: #1e40af;
  transition: color 0.3s ease;
}

.dark .text-blue-800 {
  color: #93c5fd;
}

/* 链接样式 */
.text-blue-600 {
  color: #2563eb;
  transition: color 0.3s ease;
}

.dark .text-blue-600 {
  color: #93c5fd;
}

/* 裁剪区域 */
.bg-gray-100 {
  background: #f3f4f6;
  transition: background 0.3s ease;
}

.dark .bg-gray-100 {
  background: #1e293b;
}
</style>
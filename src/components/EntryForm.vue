<template>
  <div class="w-full px-4 py-5">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
      <!-- Gallery Preview - 左侧预览区 -->
      <div
        class="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100">
        <!-- 封面预览区域 -->
        <div class="relative aspect-[2/1] bg-gradient-to-br from-gray-50 to-gray-100">
          <img v-if="previewImageUrl" :src="previewImageUrl" class="absolute inset-0 w-full h-full object-cover" />
          <div v-else class="flex flex-col items-center justify-center h-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-sm">封面预览</span>
          </div>
        </div>

        <!-- 预览信息 -->
        <div class="p-3">
          <h3 class="text-lg font-semibold mb-1.5">{{ title || '标题' }}</h3>

          <div v-if="showEscHint" class="text-xs text-indigo-500 bg-indigo-50 rounded py-1 px-2 mb-2 inline-block">
            按ESC退出条目更新
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
          <label class="block text-sm font-medium mb-1 text-gray-700">主标题</label>
          <div class="flex gap-2">
            <input v-model="title" required
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              placeholder="输入动漫主标题" ref="titleInput" />
            <button type="button" @click="toggleAltTitleInput"
              class="px-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm">
              +
            </button>
          </div>

          <!-- 其他标题输入框 -->
          <div v-if="showAltTitleInput" class="mt-2">
            <input v-model="newAltTitle" @keydown.enter.prevent="addAltTitle"
              class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="添加其他标题，Enter提交" />
          </div>
        </div>

        <!-- 标签管理 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">类型标签</label>
          <div class="flex items-center flex-wrap gap-2">
            <input v-model="newTag" @keydown.enter.prevent="addTag"
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="输入标签后按Enter添加" />
          </div>

          <!-- 标签选择区域 -->
          <div class="mt-2">
            <p class="text-xs text-gray-500 mb-1">推荐标签:</p>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" v-for="tag in filteredAllTags" :key="tag" @click.stop="addExistingTag(tag)"
                class="px-2.5 py-0.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 rounded-full text-xs transition border border-gray-200">
                {{ tag }}
              </button>
            </div>

            <p class="text-xs text-gray-500 mt-2 mb-1">已选标签:</p>
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
          <label class="block text-sm font-medium mb-1 text-gray-700">相关链接</label>
          <div v-for="(link, idx) in links" :key="idx" class="flex gap-2 mb-2">
            <input v-model="link.name"
              class="w-1/3 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="链接名称" />
            <input v-model="link.url" type="url"
              class="flex-1 border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="https://example.com" />
            <button type="button" @click="removeLink(idx)" class="px-2 text-red-500 hover:text-red-700 text-sm">
              删除
            </button>
          </div>
          <button type="button" @click="addLink"
            class="text-indigo-600 hover:text-indigo-800 text-xs flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            添加链接
          </button>
        </div>

        <!-- 封面和背景音乐 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- 封面图片选择 -->
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700">封面图片</label>
            <button type="button" @click="selectImage"
              class="w-full px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ previewImageUrl ? '重新选择图片' : '选择封面图片' }}</span>
            </button>
          </div>

          <!-- 背景音乐选择 -->
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700">背景音乐</label>
            <button type="button" @click="selectMusic"
              class="w-full px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>{{ musicPath ? '重新选择音乐' : '选择背景音乐' }}</span>
            </button>
            <div v-if="musicPath" class="mt-1 text-xs text-gray-600 truncate px-1">
              已选择: {{ musicPath }}
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
              应用裁剪
            </button>
            <button type="button" @click="resetCropper"
              class="flex-1 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重置裁剪
            </button>
          </div>
        </div>

        <!-- 简介输入 -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">简介</label>
          <textarea v-model="description" rows="3"
            class="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="输入动漫简介"></textarea>
        </div>

        <!-- 表单提交按钮 -->
        <div class="pt-3 flex gap-2">
          <button type="submit"
            class="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition flex items-center justify-center gap-1 text-sm">
            <svg v-if="isEditing" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {{ isEditing ? '更新条目' : '保存条目' }}
          </button>
          <button v-if="isEditing" type="button" @click="cancelEdit"
            class="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg font-medium hover:bg-gray-500 transition text-sm flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const allTags = ref([]);
const filteredAllTags = computed(() => {
  return allTags.value.filter(tag => !tags.value.includes(tag));
});

async function loadAllTags() {
  const tags = await window.electronAPI.getAllTags();
  allTags.value = tags;
}

const isEditing = ref(false);
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

const formState = ref({
  isVisible: false,
  isEditing: false,
  currentId: null
});

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

function addTag() {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim());
    newTag.value = '';
    showEscHint.value = false;
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

onMounted(() => {
  loadAllTags();
  window.addEventListener('tags-updated', loadAllTags);

  // 修改事件监听器
  window.addEventListener('open-form', (e) => {
    const isNew = e.detail?.isNew || false;
    resetForm();
    formState.value.isVisible = true;
    formState.value.isEditing = !isNew;

    if (isNew) {
      formState.value.currentId = null;
    }
  });

  window.addEventListener('edit-entry', async (e) => {
    const entry = e.detail;

    // 确保表单可见
    formState.value.isVisible = true;
    formState.value.isEditing = true;
    formState.value.currentId = entry.id;

    // 填充表单数据
    formState.value.isVisible = true;
    formState.value.isEditing = true;
    formState.value.currentId = entry.id;
    isEditing.value = true;
    currentId.value = entry.id;
    title.value = entry.title;
    altTitles.value = JSON.parse(entry.altTitles);
    tags.value = entry.tags ? JSON.parse(entry.tags) : [];
    links.value = entry.links ? JSON.parse(entry.links) : [];
    coverPath.value = entry.coverPath;
    musicPath.value = entry.music || null;
    description.value = entry.description || '';

    if (isEditing.value) {
      showEscHint.value = false;
    }

    previewImageUrl.value = entry.coverPath;
    cropperImageUrl.value = entry.coverPath;
    
    await nextTick();
    initCropper();
  });
});

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
  if (altTitles.value.length === 0) {
    altTitles.value.push('');
  }
}

function cancelEdit() {
  isEditing.value = false;
  resetForm();
}

function resetForm() {
  currentId.value = null;
  title.value = '';
  altTitles.value = [''];
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
    viewMode: 1,
    autoCrop: true,
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

    const canvas = cropperInstance.getCroppedCanvas({ width: 800, height: 400 }); // 调整为2/1比例
    if (canvas) {
      previewImageUrl.value = canvas.toDataURL('image/png');
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

async function onSubmit() {
  if (!previewImageUrl.value) {
    alert('请选择封面图片');
    return;
  }

  if (cropperInstance) {
    const cropSuccess = await cropImage();
    if (!cropSuccess) {
      alert('裁剪失败，请重试');
      return;
    }
    coverPath.value = previewImageUrl.value;
  } else if (!previewImageUrl.value.startsWith('data:image')) {
    alert('请先选择图片或应用裁剪');
    return;
  }

  const filename = `${Date.now()}.png`;
  coverPath.value = await window.electronAPI.saveCropped({
    dataURL: previewImageUrl.value,
    filename
  });

  const tagsToSave = tags.value && tags.value.length ? tags.value : [];

  const entry = {
    id: currentId.value,
    title: title.value,
    altTitles: JSON.stringify(altTitles.value.filter(t => t)),
    tags: JSON.stringify(tagsToSave),
    links: JSON.stringify(links.value.filter(l => l.url)),
    coverPath: coverPath.value,
    music: musicPath.value,
    description: description.value.trim() || null
  };

  if (isEditing.value) {
    await window.electronAPI.updateEntry(entry);
  } else {
    await window.electronAPI.saveEntry(entry);
  }

  resetForm();
  isEditing.value = false;
  window.dispatchEvent(new Event('entry-saved'));
}
</script>

<style scoped>
/* 动画效果 */
button {
  transition: all 0.2s ease;
}

input,
textarea {
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c5c5c5;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
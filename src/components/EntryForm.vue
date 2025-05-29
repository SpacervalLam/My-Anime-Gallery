<template>
  <div class="w-full px-6">
    <h2 class="text-3xl font-bold mb-9">  </h2>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-9">
      <!-- Gallery Preview -->
      <div class="bg-white min-w-[15rem] rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div class="relative aspect-[16/9] bg-gray-100">
          <img v-if="previewImageUrl" :src="previewImageUrl" class="absolute inset-0 w-full h-full object-cover" />
          <div v-else class="flex items-center justify-center h-full text-gray-400">
            <span>封面预览</span>
          </div>
        </div>

        <div class="p-4">
          <h3 class="text-xl font-semibold mb-2">{{ title || '标题' }}</h3>
          <div v-if="showEscHint" class="text-xs text-gray-400 mb-2">
            按ESC退出条目更新
          </div>
          
          <div v-if="altTitles.length > 0" class="mb-2 space-y-1">
            <div v-for="(altTitle, idx) in altTitles" :key="idx" class="flex items-center">
              <span class="text-sm text-gray-600 flex-1">{{ altTitle }}</span>
              <button type="button" @click.stop="removeAltTitle(idx+1)" class="text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          </div>

          <div v-if="tags.length" class="flex flex-wrap gap-2 mb-3">
            <span v-for="(tag, idx) in tags" :key="idx"
              :class="`px-2 py-1 ${tagColors[tag] || getRandomLightColor(tag)} rounded-full text-xs`">
              {{ tag }}
            </span>
          </div>

          <div v-if="links.length" class="space-y-1">
            <div v-for="(link, idx) in links" :key="idx" class="text-sm text-blue-600 truncate hover:underline">
              <a :href="link.url" target="_blank">{{ link.name || '链接' }}</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="onSubmit" class="w-full min-w-[20rem] space-y-6 bg-white p-9 rounded-xl shadow-lg">
        <div>
          <label class="block text-base font-medium mb-1.5">主标题</label>
          <div class="flex gap-2">
            <input v-model="title" required @keydown.enter.prevent="focusTagInput"
              class="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="输入动漫主标题" ref="titleInput" />
            <button type="button" @click="toggleAltTitleInput"
              class="px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              +
            </button>
          </div>
          
          <!-- 其他标题输入框 -->
          <div v-if="showAltTitleInput" class="mt-2">
            <input v-model="newAltTitle" @keydown.enter.prevent="addAltTitle"
              class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="添加其他标题，Enter提交" />
          </div>
          

        </div>

        <div>
          <label class="block text-sm font-medium mb-1">类型标签</label>
          <div class="flex items-center flex-wrap gap-2">
            <input v-model="newTag" @keydown.enter.prevent="addTag"
              class="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="选择输入或标签后按Enter添加" />
          </div>
          
          <div class="flex flex-wrap gap-2 mt-2">
            <!-- 显示已有标签 -->
            <button type="button" v-for="tag in filteredAllTags" :key="tag" @click.stop="addExistingTag(tag)"
              class="px-3 py-1 bg-gray-100 hover:bg-indigo-100 text-gray-800 rounded-full text-sm transition">
              {{ tag }}
            </button>
            
            <!-- 显示已选标签 -->
            <span v-for="(tag, idx) in tags" :key="idx"
              :class="`inline-flex items-center px-3 py-1 ${tagColors[tag] || getRandomLightColor(tag)} rounded-full text-sm`">
              {{ tag }}
              <button type="button" @click="removeTag(idx)" class="ml-1 text-indigo-600 hover:text-indigo-800">
                &times;
              </button>
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">相关链接</label>
          <div v-for="(link, idx) in links" :key="idx" class="flex gap-2 mb-2">
            <input v-model="link.name"
              class="w-1/3 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="链接名称" />
            <input v-model="link.url" type="url"
              class="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com" />
            <button type="button" @click="removeLink(idx)" class="px-3 text-red-500 hover:text-red-700">
              删除
            </button>
          </div>
          <button type="button" @click="addLink"
            class="text-indigo-600 hover:text-indigo-800 text-sm flex items-center">
            <span class="mr-1">+</span> 添加链接
          </button>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">封面图片</label>
          <div class="relative">
            <button type="button" @click="selectImage"
              class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              <span>{{ previewImageUrl ? '重新选择图片' : '选择封面图片' }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">背景音乐</label>
          <div class="relative">
            <button type="button" @click="selectMusic"
              class="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
              <span>{{ musicPath ? '重新选择音乐' : '选择背景音乐' }}</span>
            </button>
            <div v-if="musicPath" class="mt-2 text-sm text-gray-600 truncate">
              已选择: {{ musicPath }}
            </div>

            <div v-if="previewImageUrl" class="mt-4 space-y-3">
              <div class="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
                <img ref="cropperImgRef" :src="cropperImageUrl" class="w-full h-full object-contain"
                  @load="initCropper" />
              </div>

              <div class="flex gap-3">
                <button type="button" @click="cropImage"
                  class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                  应用裁剪
                </button>
                <button type="button" @click="resetCropper"
                  class="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
                  重置裁剪
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">简介</label>
          <textarea v-model="description" rows="4"
            class="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="输入动漫简介"></textarea>
        </div>

        <div class="pt-4 flex gap-3">
          <button type="submit"
            class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            {{ isEditing ? '更新条目' : '保存条目' }}
          </button>
          <button v-if="isEditing" type="button" @click="cancelEdit"
            class="flex-1 px-6 py-3 bg-gray-400 text-white rounded-xl font-semibold hover:bg-gray-500 transition">
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';

const allTags = ref([]);
const filteredAllTags = computed(() => {
  return allTags.value.filter(tag => !tags.value.includes(tag));
});

async function loadAllTags() {
  const tags = await window.electronAPI.getAllTags();
  allTags.value = tags;
}
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

const isEditing = ref(false);
const currentId = ref(null);
const title = ref('');
const altTitles = ref(['']);
const showAltTitleInput = ref(false);
const newAltTitle = ref('');
const tags = ref([]);
const newTag = ref('');
const links = ref([]);
const showEscHint = ref(true);
const previewImageUrl = ref(null); // 用于左侧预览
const cropperImageUrl = ref(null); // 用于右侧裁剪
const coverPath = ref(null);
const musicPath = ref(null);
const description = ref('');
let cropperInstance = null;
const cropperImgRef = ref(null);

const tagColors = ref({});

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
    // 确保所有标签都有随机颜色
    getRandomLightColor(tag);
    showEscHint.value = false;
  }
}

function addTag() {
  // 添加新标签到标签列表中
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim());
    newTag.value = '';
    showEscHint.value = false;
  }
}

function removeTag(index) {
  // 根据索引移除标签
  tags.value.splice(index, 1);
}

function addLink() {
  // 添加新的链接对象到链接列表中
  links.value.push({ name: '', url: '' });
}

function removeLink(index) {
  // 根据索引移除链接
  links.value.splice(index, 1);
}

onMounted(() => {
  loadAllTags();
  // 监听标签更新事件
  window.addEventListener('tags-updated', loadAllTags);
  // 监听显示表单事件
  window.addEventListener('show-entry-form', () => {
    resetForm();
    isEditing.value = false;
  });

  // 监听编辑条目事件
  window.addEventListener('edit-entry', async e => {
    const entry = e.detail;
    isEditing.value = true;
    currentId.value = entry.id;
    title.value = entry.title;
    altTitles.value = JSON.parse(entry.altTitles);
    tags.value = entry.tags ? JSON.parse(entry.tags) : [];
    links.value = entry.links ? JSON.parse(entry.links) : [];
    coverPath.value = entry.coverPath;
    musicPath.value = entry.music || null;
    description.value = entry.description || '';
    // 仅在编辑模式下设置一次showEscHint
    if (isEditing.value) {
      showEscHint.value = false;
    }
    previewImageUrl.value = entry.coverPath;
    cropperImageUrl.value = entry.coverPath;
    await nextTick();
    initCropper();
  });
});

function focusTagInput() {
  document.querySelector('input[placeholder="选择输入或标签后按Enter添加"]').focus();
}

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
  // 取消编辑，重置表单
  isEditing.value = false;
  resetForm();
}

function resetForm() {
  // 重置表单所有字段
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
  // 选择封面图片
  const filePath = await window.electronAPI.openFile();
  if (filePath) {
    // 设置裁剪区域图片（原始图片）
    cropperImageUrl.value = filePath;

    // 设置预览区域图片（原始图片）
    previewImageUrl.value = filePath;

    // 保存原始文件路径用于后续裁剪
    coverPath.value = filePath;

    await nextTick();
    initCropper();
  }
}

async function selectMusic() {
  // 选择背景音乐文件
  const filePath = await window.electronAPI.openFile({
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }
    ]
  });
  if (filePath) {
    musicPath.value = filePath;
  }
}

function initCropper() {
  // 初始化图片裁剪器
  if (cropperImgRef.value && cropperImageUrl.value) {
    if (cropperInstance) {
      cropperInstance.destroy();
    }
    cropperInstance = new Cropper(cropperImgRef.value, {
      aspectRatio: 16 / 9,
      viewMode: 1,
      autoCrop: true,
      ready() {
        this.crop();
      }
    });
  }
}

function resetCropper() {
  // 重置裁剪器到初始状态
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

    const canvas = cropperInstance.getCroppedCanvas({ width: 800, height: 450 });
    if (canvas) {
      previewImageUrl.value = canvas.toDataURL('image/png');
      console.log('生成裁剪预览');
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

async function onSubmit() {
  // 提交表单数据
  if (!previewImageUrl.value) {
    alert('请选择封面图片');
    return;
  }

  // 自动应用裁剪并等待完成
  if (cropperInstance) {
    const cropSuccess = await cropImage();
    if (!cropSuccess) {
      alert('裁剪失败，请重试');
      return;
    }
    // 裁剪后强制使用预览URL作为封面路径
    coverPath.value = previewImageUrl.value;
  } else if (!previewImageUrl.value.startsWith('data:image')) {
    alert('请先选择图片或应用裁剪');
    return;
  }

  // 保存裁剪后的图片文件
  const filename = `${Date.now()}.png`;
  coverPath.value = await window.electronAPI.saveCropped({
    dataURL: previewImageUrl.value,
    filename
  });
  console.log('保存图片到:', coverPath.value);
  // 确保标签数组不为空或undefined
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

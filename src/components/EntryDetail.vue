<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-3/4 max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex">
          <div class="w-1/3">
            <img :src="entry.coverPath" class="w-full rounded-lg" alt="Cover Image">
          </div>
          <div class="w-2/3 pl-6">
            <h1 class="text-2xl font-bold mb-2">{{ entry.title }}</h1>
            <div v-if="entry.altTitles" class="mb-4">
              <h2 class="text-lg font-semibold">其他标题</h2>
              <p class="text-gray-600">{{ entry.altTitles }}</p>
            </div>
            <div v-if="entry.description" class="mb-4">
              <h2 class="text-lg font-semibold">简介</h2>
              <p class="text-gray-600">{{ entry.description }}</p>
            </div>
            <div v-if="entry.tags" class="mb-4">
              <h2 class="text-lg font-semibold">标签</h2>
              <p class="text-gray-600">{{ entry.tags }}</p>
            </div>
            <div v-if="entry.link" class="mb-4">
              <h2 class="text-lg font-semibold">相关链接</h2>
              <a :href="entry.link" target="_blank" class="text-blue-500 hover:underline">{{ entry.link }}</a>
            </div>
            <button @click="playMusic" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              播放背景音乐
            </button>
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-gray-200 flex justify-end">
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    entry: {
      type: Object,
      required: true
    }
  },
  methods: {
    playMusic() {
      if (this.entry.music) {
        const audio = new Audio(this.entry.music);
        audio.play();
      }
    }
  }
}
</script>

<style scoped>
/* 添加必要的样式 */
</style>

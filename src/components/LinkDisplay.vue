<template>
  <div class="epub-container">
    <div ref="viewer" class="epub-viewer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Epub from 'epubjs';

const props = defineProps({
  epubUrl: {
    type: String,
    required: true
  }
});

const viewer = ref(null);
let book = null;
let rendition = null;

onMounted(() => {
  book = Epub(props.epubUrl);
  rendition = book.renderTo(viewer.value, {
    width: '100%',
    height: '100%',
    spread: 'none'
  });
  
  rendition.display();
});

onUnmounted(() => {
  if (rendition) {
    rendition.destroy();
  }
  if (book) {
    book.destroy();
  }
});
</script>

<style scoped>
.epub-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.epub-viewer {
  width: 100%;
  height: 100%;
}
</style>

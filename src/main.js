import { createApp, ref, watch } from 'vue';
import App from './App.vue';
import './assets/styles/main.css';
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import zh from './locales/zh.json';
import jp from './locales/jp.json';

const i18n = createI18n({
  locale: 'zh', // 默认语言
  fallbackLocale: 'en',
  messages: {
    en,
    zh,
    jp
  }
});

const app = createApp(App);
app.use(i18n);
app.mount('#app');

const currentLanguage = ref(i18n.global.locale);
currentLanguage.value = i18n.global.locale; // 确保初始值同步

watch(currentLanguage, (newLocale) => {
  i18n.global.locale = newLocale; // 更新 i18n 的语言
});

export { currentLanguage };

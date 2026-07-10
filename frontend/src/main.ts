import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './styles/index.css';
import { installGlobalImageFallback } from './utils/imageFallback';

const app = createApp(App);
const pinia = createPinia();

installGlobalImageFallback();

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.mount('#app');

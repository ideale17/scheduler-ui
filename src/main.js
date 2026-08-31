import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/tailwind.css' // Tailwind CSS import 추가

createApp(App).use(router).mount('#app')

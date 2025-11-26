import { createApp } from 'vue'
import router from './router/index.js'  // Full path to router
import App from './App.vue'
import './assets/scss/main.scss'

createApp(App).use(router).mount('#app')

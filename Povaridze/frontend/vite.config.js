import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: blob: data:",
        "style-src 'self' 'unsafe-inline' http: https: blob: data:",
        "img-src 'self' http://localhost:5000 https: blob: data:",
        "connect-src 'self' http://localhost:5000 https: ws:",
        "frame-src 'self' https://www.youtube.com https://youtube.com"  
      ].join('; ')
    }
  }
})
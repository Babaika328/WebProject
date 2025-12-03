<template>
  <div class="auth-container">
    <div class="auth-card">
      <img src="http://localhost:5000/images/logo.png" alt="Povaridze" class="auth-logo" />
      <h1 class="auth-title">Welcome Back</h1>

      <input v-model="credential" placeholder="Email or Username" class="auth-input" />
      
      <div class="password-wrapper">
        <input 
          v-model="password" 
          :type="showPassword ? 'text' : 'password'" 
          placeholder="Password" 
          class="auth-input"
        />
        <button @click="showPassword = !showPassword" class="eye-btn" type="button" aria-label="Toggle password">
          <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
      </div>

      <button @click="login" :disabled="loading" class="auth-btn primary">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>

      <p class="text-center mt-6">
        No account? 
        <router-link to="/signup" class="text-primary font-bold hover:underline">Sign Up</router-link>
      </p>

      <p v-if="error" class="error-text">Invalid credentials!</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const credential = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const login = async () => {
  if (!credential.value || !password.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await axios.post('http://localhost:5000/api/auth/login', {
      credential: credential.value,
      password: password.value
    })
    localStorage.setItem('token', data.token)
    router.push('/')
  } catch (err) {
    error.value = 'Invalid credentials!'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container { @apply min-h-screen bg-gray-50 flex items-center justify-center p-4; }
.auth-card { @apply bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center; }
.auth-logo { @apply h-32 mx-auto mb-6; }
.auth-title { @apply text-4xl font-bold text-primary mb-10; }
.auth-input { @apply w-full px-6 py-4 rounded-xl border border-gray-300 focus:border-primary focus:outline-none mb-6 text-lg; }

.password-wrapper { @apply relative; }
.eye-btn {
  @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors;
}
.eye-icon { @apply w-6 h-6; }
.auth-input { @apply pr-20; }

.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }

.error-text { @apply text-red-600 font-bold mt-6 text-lg; }
</style>
<template>
  <div class="auth-container">
    <div class="auth-card">
      <img src="https://i.imgur.com/2EnxFDX.jpeg" alt="Povaridze" class="auth-logo" />
      <h1 class="auth-title text-primary">Reset Password</h1>

      <div v-if="!codeSent">
        <p class="text-center text-gray-700 mb-8">Enter your email and we'll send you a 6-digit code</p>
        <input v-model="email" type="email" placeholder="Your email" class="auth-input" @keyup.enter="sendCode" />
        <button @click="sendCode" :disabled="sending || !email.trim()" class="auth-btn primary mt-8">
          {{ sending ? 'Sending...' : 'Send Code' }}
        </button>
        <p v-if="error" class="error-text mt-6">{{ error }}</p>
      </div>

      <div v-else>
        <p class="info-text">Code sent to</p>
        <p class="email-display"><strong>{{ email }}</strong></p>
        <p class="timer-text">Time left: {{ formatTime(timer) }}</p>
        <p class="spam-text">Check spam folder!</p>

        <div class="code-inputs mb-8">
          <input v-for="n in 6" :key="n" v-model="codeDigits[n-1]" type="text" maxlength="1" class="code-box"
            @input="handleInput($event, n-1)" @keydown="handleKeydown($event, n-1)" ref="codeInputs" />
        </div>

        <p class="attempts-text mb-6">
          <span :class="{ 'text-red-600': attempts < 3, 'text-green-600': attempts === 3 }">
            <strong>{{ attempts }}</strong>
          </span> attempts left
        </p>

        <div class="password-wrapper relative mb-4">
          <input v-model="pass.new" :type="showNew ? 'text' : 'password'" placeholder="New password" class="auth-input" />
          <button type="button" @click="showNew = !showNew" class="eye-btn">
            <svg v-if="!showNew" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>

        <div class="password-wrapper relative mb-6">
          <input v-model="pass.confirm" :type="showConfirm ? 'text' : 'password'" placeholder="Confirm new password" class="auth-input" />
          <button type="button" @click="showConfirm = !showConfirm" class="eye-btn">
            <svg v-if="!showConfirm" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>

        <div class="password-requirements mb-8">
          <ul class="text-left space-y-1 text-sm">
            <li :class="pass.new.length >= 8 ? 'text-green-600' : 'text-gray-500'">8+ characters</li>
            <li :class="hasUppercase ? 'text-green-600' : 'text-gray-500'">One uppercase letter</li>
            <li :class="hasNumber ? 'text-green-600' : 'text-gray-500'">One number</li>
            <li :class="hasSpecial ? 'text-green-600' : 'text-gray-500'">One special character</li>
            <li :class="passwordsMatch ? 'text-green-600' : 'text-gray-500'">Passwords match</li>
          </ul>
        </div>

        <button @click="resetPassword" :disabled="resetting || code.length !== 6 || !isPasswordValid" class="auth-btn primary">
          {{ resetting ? 'Resetting...' : 'Reset Password' }}
        </button>

        <button @click="sendCode" class="auth-btn secondary mt-4" :disabled="sending">
          Resend Code
        </button>

        <p v-if="error" class="error-text mt-6">{{ error }}</p>
        <p v-if="success" class="text-green-600 font-bold text-xl mt-6">{{ success }}</p>
      </div>

      <p class="text-center mt-8">
        <router-link :to="backRoute" class="text-primary font-bold hover:underline">
          {{ backText }}
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const fromProfile = route.query.from === 'profile'
const backText = computed(() => fromProfile ? 'Back to Profile' : 'Back to Login')
const backRoute = computed(() => fromProfile ? '/profile' : '/login')

const API_BASE = 'http://localhost:5000/api'

const email = ref('')
const codeDigits = ref(['', '', '', '', '', ''])
const pass = ref({ new: '', confirm: '' })
const showNew = ref(false)
const showConfirm = ref(false)
const codeSent = ref(false)
const sending = ref(false)
const resetting = ref(false)
const error = ref('')
const success = ref('')
const timer = ref(300) 
let interval = null
const attempts = ref(3)

const code = computed(() => codeDigits.value.join(''))
const hasUppercase = computed(() => /[A-Z]/.test(pass.value.new))
const hasNumber = computed(() => /\d/.test(pass.value.new))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass.value.new))
const passwordsMatch = computed(() => pass.value.new === pass.value.confirm && pass.value.new !== '')
const isPasswordValid = computed(() => pass.value.new.length >= 8 && hasUppercase.value && hasNumber.value && hasSpecial.value && passwordsMatch.value)

const sendCode = async () => {
  if (!email.value.trim()) {
    error.value = 'Enter your email'
    return
  }

  sending.value = true
  error.value = ''
  try {
    await axios.post(`${API_BASE}/auth/forgot-password`, { email: email.value.trim() })
  } catch (err) {
    // Маскировка — всегда переходим на второй шаг
  } finally {
    sending.value = false
    codeSent.value = true
    timer.value = 300
    attempts.value = 3
    codeDigits.value = ['', '', '', '', '', '']
    startTimer()
    nextTick(() => codeInputs.value[0]?.focus())
  }
}

const resetPassword = async () => {
  if (code.value.length !== 6) return

  resetting.value = true
  error.value = ''
  try {
    await axios.post(`${API_BASE}/auth/reset-password`, {
      email: email.value.trim(),
      code: code.value,
      newPassword: pass.value.new
    })
    success.value = 'Password reset successfully!'
    setTimeout(() => router.push(backRoute.value), 2000)
  } catch (err) {
    attempts.value--
    error.value = err.response?.data?.error || 'Invalid or expired code'
    codeDigits.value = ['', '', '', '', '', '']
    nextTick(() => codeInputs.value[0]?.focus())
    if (attempts.value === 0) {
      error.value = 'No attempts left. Please request a new code.'
    }
  } finally {
    resetting.value = false
  }
}

const handleInput = (e, index) => {
  let value = e.target.value.replace(/\D/g, '')
  if (value) codeDigits.value[index] = value[0]
  if (value && index < 5) nextTick(() => codeInputs.value[index + 1]?.focus())
}

const handleKeydown = (e, index) => {
  if (e.key === 'Backspace' && !codeDigits.value[index] && index > 0) {
    nextTick(() => codeInputs.value[index - 1]?.focus())
  }
}

const startTimer = () => {
  clearInterval(interval)
  interval = setInterval(() => {
    if (timer.value > 0) timer.value--
    else {
      clearInterval(interval)
      error.value = 'Time expired. Please request a new code.'
    }
  }, 1000)
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const codeInputs = ref([])

onMounted(() => {
  if (codeSent.value) startTimer()
})

onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.auth-container { @apply min-h-screen bg-gray-50 flex items-center justify-center p-4; }
.auth-card { @apply bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center; }
.auth-logo { @apply w-32 mx-auto mb-8; }
.auth-title { @apply text-4xl font-bold mb-12; }
.auth-input { @apply w-full px-6 py-4 rounded-2xl border border-gray-300 focus:border-primary outline-none text-lg; }
.password-wrapper { @apply relative; }
.eye-btn { @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors; }
.eye-icon { @apply w-6 h-6; }
.info-text { @apply text-gray-700 text-lg; }
.email-display { @apply font-bold text-xl text-primary; }
.timer-text { @apply text-2xl font-bold text-primary my-6; }
.spam-text { @apply text-sm text-orange-600 mb-6; }
.code-inputs { @apply flex justify-center gap-4 my-8; }
.code-box { @apply w-14 h-14 text-center text-3xl font-bold rounded-xl border-2 border-gray-300 focus:border-primary outline-none; }
.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300 mt-4; }
.attempts-text { @apply text-xl mt-6; }
.attempts-text strong { @apply font-black text-3xl; }
.password-requirements { @apply text-left text-sm mt-4 mb-8 px-4; }
.error-text { @apply text-red-600 font-bold mt-6 text-lg text-center; }
</style>
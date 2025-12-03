<template>
  <div class="auth-container">
    <div class="auth-card">
      <img src="http://localhost:5000/images/logo.png" alt="Povaridze" class="auth-logo" />
      <h1 class="auth-title">Create Account</h1>

      <div v-if="!codeSent">
        <input v-model="email" type="email" placeholder="Your email" class="auth-input" @keyup.enter="sendCode" required />
        <button @click="sendCode" :disabled="sending" class="auth-btn primary">
          {{ sending ? 'Sending...' : 'Send Code' }}
        </button>
      </div>

      <div v-else-if="!verified">
        <p class="info-text">Enter the 6-digit code sent to</p>
        <p class="email-display"><strong>{{ email }}</strong></p>
        <p class="timer-text">Time left: {{ formatTime(timer) }}</p>
        <p class="spam-text">Check your spam folder!</p>

        <div class="code-inputs">
          <input v-for="n in 6" :key="n" v-model="codeDigits[n-1]" type="text" maxlength="1" class="code-box"
            @input="handleInput($event, n-1)" @keydown="handleKeydown($event, n-1)" @keyup.enter="code.length === 6 && verifyCode()" ref="codeInputs" />
        </div>

        <p class="attempts-text">
          <span :class="{ 'text-red-600': attempts < 3, 'text-green-600': attempts === 3 }">
            <strong>{{ attempts }}</strong>
          </span> attempts left
        </p>

        <div class="btn-group">
          <button @click="verifyCode" :disabled="verifying || code.length !== 6" class="auth-btn primary">
            {{ verifying ? 'Verifying...' : 'Verify & Continue' }}
          </button>
          <button @click="sendCode" class="auth-btn secondary" :disabled="sending">
            Resend Code
          </button>
        </div>
      </div>

      <div v-else>
        <input v-model="username" placeholder="Choose username" class="auth-input" required />
        
        <div class="password-wrapper">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Create password" class="auth-input" required />
          <button @click="showPassword = !showPassword" class="eye-btn" type="button">
            <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>

        <div class="password-requirements" :class="{ 'text-green-600': isPasswordValid, 'text-red-600': password && !isPasswordValid }">
          <p>Password must contain:</p>
          <ul class="text-sm space-y-1 text-left ml-8">
            <li :class="password.length >= 8 ? 'text-green-600' : 'text-gray-500'">8+ characters</li>
            <li :class="hasUppercase ? 'text-green-600' : 'text-gray-500'">One uppercase letter</li>
            <li :class="hasNumber ? 'text-green-600' : 'text-gray-500'">One number</li>
            <li :class="hasSpecial ? 'text-green-600' : 'text-gray-500'">One special character</li>
          </ul>
        </div>

        <button @click="register" :disabled="registering || !isPasswordValid" class="auth-btn primary">
          {{ registering ? 'Creating...' : 'Complete Registration' }}
        </button>
      </div>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const email = ref('')
const username = ref('')
const password = ref('')
const codeDigits = ref(['', '', '', '', '', ''])
const attempts = ref(3)

const code = computed(() => codeDigits.value.join(''))

const hasUppercase = computed(() => /[A-Z]/.test(password.value))
const hasNumber = computed(() => /\d/.test(password.value))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password.value))

const isPasswordValid = computed(() => {
  return password.value.length >= 8 && hasUppercase.value && hasNumber.value && hasSpecial.value
})

const codeSent = ref(false)
const verified = ref(false)
const timer = ref(300)
let interval = null

const sending = ref(false)
const verifying = ref(false)
const registering = ref(false)
const showPassword = ref(false)
const error = ref('')

const codeInputs = ref([])

const sendCode = async () => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!email.value || !emailRegex.test(email.value)) {
    error.value = 'Please enter a valid email address'
    return
  }

  sending.value = true
  error.value = ''
  try {
    await axios.post('http://localhost:5000/api/auth/send-code', { email: email.value })
    codeSent.value = true
    attempts.value = 3
    codeDigits.value = ['', '', '', '', '', '']
    timer.value = 300
    startTimer()
    nextTick(() => codeInputs.value[0]?.focus())
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to send code'
  } finally {
    sending.value = false
  }
}

const verifyCode = async () => {
  if (code.value.length !== 6) return
  verifying.value = true
  error.value = ''
  try {
    await axios.post('http://localhost:5000/api/auth/verify-code', { email: email.value, code: code.value })
    verified.value = true
    clearInterval(interval)
  } catch (err) {
    attempts.value--
    codeDigits.value = ['', '', '', '', '', '']
    nextTick(() => codeInputs.value[0]?.focus())
    if (attempts.value === 0) {
      error.value = 'No attempts left. Please request a new code.'
      codeSent.value = false
    } else {
      error.value = `Wrong code. ${attempts.value} attempts left.`
    }
  } finally {
    verifying.value = false
  }
}

const register = async () => {
  if (!username.value) {
    error.value = 'Please choose a username'
    return
  }
  if (!isPasswordValid.value) {
    error.value = 'Password does not meet requirements'
    return
  }

  registering.value = true
  error.value = ''
  try {
    const { data } = await axios.post('http://localhost:5000/api/auth/register', {
      username: username.value,
      email: email.value,
      password: password.value
    })
    localStorage.setItem('token', data.token)
    router.push('/') 
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed'
  } finally {
    registering.value = false
  }
}

const handleInput = (e, index) => {
  let value = e.target.value.replace(/[^0-9]/g, '')
  if (value.length > 1) value = value[0]
  codeDigits.value[index] = value
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
    else clearInterval(interval)
  }, 1000)
}

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

onMounted(() => {
  if (codeSent.value) startTimer()
})
onUnmounted(() => clearInterval(interval))
</script>

<style scoped>
.auth-container { @apply min-h-screen bg-gray-50 flex items-center justify-center p-4; }
.auth-card { @apply bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center; }
.auth-logo { @apply h-28 mx-auto mb-6; }
.auth-title { @apply text-4xl font-bold text-primary mb-8; }
.auth-input { @apply w-full px-6 py-4 rounded-xl border border-gray-300 focus:border-primary focus:outline-none mb-6 text-lg; }

.password-wrapper { @apply relative; }
.eye-btn { @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors; }
.eye-icon { @apply w-6 h-6; }
.auth-input { @apply pr-20; }

.info-text, .email-display { @apply text-gray-700 text-lg; }
.email-display { @apply font-bold text-xl; }
.timer-text { @apply text-2xl font-bold text-primary my-4; }
.spam-text { @apply text-sm text-orange-600 font-medium mb-6; }

.code-inputs { @apply flex justify-center gap-4 my-8; }
.code-box { @apply w-14 h-14 text-center text-3xl font-bold rounded-xl border-2 border-gray-300 focus:border-primary focus:outline-none transition-all; }

.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300 mt-4; }

.attempts-text { @apply text-xl mt-6; }
.attempts-text strong { @apply font-black text-3xl; }

.password-requirements { @apply text-left text-sm mt-2 mb-6 px-2; }

.error-text { @apply text-red-600 font-bold mt-6; }
</style>
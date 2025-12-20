<template>
  <div class="container py-12">
    <h1 class="text-5xl font-bold text-center text-primary mb-12">My Profile</h1>

    <div class="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl p-10">

      <div v-if="cropperVisible" class="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-8 max-w-2xl w-full">
          <h3 class="text-3xl font-bold text-primary mb-6 text-center">Adjust your avatar</h3>
          <div class="cropper-container">
            <Cropper
              ref="cropper"
              :src="previewUrl"
              :stencil-component="CircleStencil"
              :stencil-props="{ aspectRatio: 1 }"
              image-restriction="stencil"
              :min-scale="0.5"
              :max-scale="3"
              :wheel-resize="true"
              :wheel-scale-factor="0.12"
              class="cropper"
              @change="onCropChange"
            />
          </div>
          <div class="flex gap-6 mt-8">
            <button @click="cropperVisible = false" class="auth-btn secondary flex-1 text-xl py-4">Cancel</button>
            <button @click="applyCrop" class="auth-btn primary flex-1 text-xl py-4">Apply Crop</button>
          </div>
        </div>
      </div>

      <div class="text-center mb-12">
        <div class="relative inline-block">
          <img
            v-if="pendingAvatarUrl || user.profilePicture"
            :src="pendingAvatarUrl || avatarUrl"
            alt="Avatar"
            class="w-40 h-40 rounded-full object-cover border-8 shadow-2xl transition-all duration-300"
            :class="pendingAvatarUrl ? 'border-green-500 border-dashed animate-pulse' : 'border-primary'"
          />
          <div
            v-else
            class="w-40 h-40 rounded-full bg-primary text-white text-7xl font-black flex items-center justify-center border-8 border-primary shadow-2xl"
          >
            {{ user.username?.[0]?.toUpperCase() || '?' }}
          </div>

          <label class="absolute bottom-3 right-3 bg-green-600 hover:bg-green-700 text-white p-4 rounded-full cursor-pointer shadow-xl transition-all hover:scale-110">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input type="file" accept="image/*" @change="onFileSelect" class="hidden" />
          </label>
        </div>
      </div>

      <div class="relative mb-8">
        <input
          ref="usernameInput"
          v-model="form.username"
          :disabled="!editing.username"
          class="auth-input text-xl pr-16 transition-all duration-300"
          :class="usernamePending ? 'border-green-500 border-dashed animate-pulse' : ''"
          placeholder="Username"
          required
        />
        <button @click="toggleEdit('username')" class="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700 transition">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <div class="relative mb-8">
        <input
          ref="emailInput"
          v-model="form.email"
          :disabled="!editing.email"
          type="email"
          class="auth-input text-xl pr-16"
          placeholder="Email"
          required
        />
        <button @click="toggleEdit('email')" class="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700 transition">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <small v-if="editing.email" class="text-orange-600 block mt-2 text-sm">
          Changing email requires verification code sent to the new address
        </small>
      </div>

      <div v-if="emailVerificationVisible" class="mb-8">
        <p class="text-center text-gray-700 mb-2">Enter the 6-digit code sent to</p>
        <p class="text-center font-bold text-xl mb-4">{{ pendingEmail }}</p>

        <p class="text-2xl font-bold text-primary mb-4">Time left: {{ formattedTimer }}</p>

        <p class="text-xl mb-6">
          <span :class="{ 'text-red-600': attemptsLeft < 2, 'text-orange-600': attemptsLeft === 2, 'text-green-600': attemptsLeft === 3 }">
            <strong>{{ attemptsLeft }}</strong> attempt{{ attemptsLeft === 1 ? '' : 's' }} left
          </span>
        </p>

        <p class="text-sm text-orange-600 font-medium mb-6">Check your spam folder!</p>

        <div class="code-inputs">
          <input v-for="n in 6" :key="n" v-model="emailCodeDigits[n-1]" type="text" maxlength="1" class="code-box"
            @input="handleEmailCodeInput($event, n-1)" @keydown="handleEmailCodeKeydown($event, n-1)" ref="emailCodeInputs" />
        </div>

        <p v-if="emailCodeError" class="error-text text-center mt-4">{{ emailCodeError }}</p>

        <div class="mt-6">
          <button @click="resendCode" class="auth-btn secondary w-full" :disabled="requestingEmailChange">
            {{ requestingEmailChange ? 'Sending...' : 'Resend Code' }}
          </button>
        </div>
      </div>

      <p v-if="profileError" class="error-text text-center mb-4">{{ profileError }}</p>
      <p v-if="profileSuccess" class="text-green-600 font-bold text-xl text-center mb-6">{{ profileSuccess }}</p>
      <p v-if="emailChangeSuccess" class="text-green-600 font-bold text-xl text-center mb-6">{{ emailChangeSuccess }}</p>

      <div class="flex gap-4 mb-12">
        <button
          @click="updateProfile"
          :disabled="saving || (!usernamePending && !pendingAvatarBlob)"
          class="auth-btn primary flex-1 text-xl py-5"
        >
          {{ saving ? 'Saving...' : 'Save Username & Avatar' }}
        </button>

        <button
          v-if="form.email !== original.email"
          @click="requestEmailChange"
          :disabled="requestingEmailChange"
          class="auth-btn primary flex-1 text-xl py-5"
        >
          {{ requestingEmailChange ? 'Sending code...' : 'Change Email' }}
        </button>
      </div>

      <hr class="my-12 border-gray-300">

      <h3 class="text-3xl font-bold text-primary text-center mb-8">Change Password</h3>

      <form @submit.prevent="changePassword" class="space-y-8">
        <div class="password-wrapper">
          <input v-model="pass.current" :type="showCurrent ? 'text' : 'password'" placeholder="Current password" class="auth-input text-xl" required />
          <button type="button" @click="showCurrent = !showCurrent" class="eye-btn">
            <svg v-if="!showCurrent" class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else class="eye-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </button>
        </div>

        <div class="text-right -mt-6 mb-6">
          <router-link :to="{ path: '/forgot-password', query: { from: 'profile' } }" class="text-primary font-bold hover:underline">
              Forgot password?
          </router-link>
        </div>

        <div class="password-wrapper">
          <input v-model="pass.new" :type="showNew ? 'text' : 'password'" placeholder="New password" class="auth-input text-xl" required />
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

        <div class="password-wrapper">
          <input v-model="pass.confirm" :type="showConfirm ? 'text' : 'password'" placeholder="Confirm new password" class="auth-input text-xl" required />
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

        <div class="password-requirements">
          <ul class="text-left space-y-1 text-sm">
            <li :class="pass.new.length >= 8 ? 'text-green-600' : 'text-gray-500'">8+ characters</li>
            <li :class="hasUppercase ? 'text-green-600' : 'text-gray-500'">One uppercase letter</li>
            <li :class="hasNumber ? 'text-green-600' : 'text-gray-500'">One number</li>
            <li :class="hasSpecial ? 'text-green-600' : 'text-gray-500'">One special character</li>
            <li :class="passwordsMatch ? 'text-green-600' : 'text-gray-500'">Passwords match</li>
          </ul>
        </div>

        <p v-if="passwordError" class="error-text text-center mb-4">{{ passwordError }}</p>
        <p v-if="passwordSuccess" class="text-green-600 font-bold text-xl text-center mb-6">{{ passwordSuccess }}</p>

        <button
          type="submit"
          :disabled="changing || !isPasswordValid"
          class="auth-btn primary w-full text-xl py-5"
        >
          {{ changing ? 'Changing...' : 'Change Password' }}
        </button>
      </form>

      <div class="mt-16 text-center">
        <button @click="showDeleteModal = true" class="text-red-600 font-bold text-xl hover:text-red-800 transition">
          Delete My Account
        </button>
      </div>

      <transition name="modal">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal">
            <h3 class="modal-title text-red-600">Delete Account?</h3>
            <p class="modal-text">This action is permanent. All your data will be lost.</p>
            <div class="mb-6">
              <input v-model="deletePassword" type="password" placeholder="Enter your password to confirm" class="auth-input placeholder:text-base placeholder:text-gray-500" />
            </div>
            <p v-if="deleteError" class="error-text mb-4">{{ deleteError }}</p>
            <div class="modal-buttons">
              <button @click="deleteMyAccount" :disabled="deleting || !deletePassword" class="btn-danger">
                {{ deleting ? 'Deleting...' : 'Delete Forever' }}
              </button>
              <button @click="showDeleteModal = false" class="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="modal">
        <div v-if="confirmLeave" class="modal-overlay" @click.self="stay">
          <div class="modal">
            <h3 class="modal-title">You have unsaved changes</h3>
            <p class="modal-text">Are you sure you want to leave without saving?</p>
            <div class="modal-buttons">
              <button @click="forceLeave" class="btn-danger">Leave</button>
              <button @click="stay" class="btn-cancel">Stay</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const API_BASE = 'http://localhost:5000/api'

const user = ref({})
const original = ref({ username: '', email: '', profilePicture: '' })
const form = ref({ username: '', email: '' })
const editing = ref({ username: false, email: false })

const pendingAvatarBlob = ref(null)
const pendingAvatarUrl = ref('')
const croppedCanvas = ref(null)

const requestingEmailChange = ref(false)
const emailVerificationVisible = ref(false)
const pendingEmail = ref('')
const emailCodeDigits = ref(['', '', '', '', '', ''])
const emailCodeError = ref('')
const emailChangeSuccess = ref('')
const attemptsLeft = ref(3)
const timer = ref(300)
let timerInterval = null

const pass = ref({ current: '', new: '', confirm: '' })
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const saving = ref(false)
const changing = ref(false)
const profileError = ref('')
const profileSuccess = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')

const cropperVisible = ref(false)
const previewUrl = ref('')
const avatarVersion = ref(0)

const confirmLeave = ref(false)

const showDeleteModal = ref(false)
const deletePassword = ref('')
const deleteError = ref('')
const deleting = ref(false)

const avatarUrl = computed(() => {
  if (!user.value?.profilePicture) return ''
  return `http://localhost:5000/avatars/${user.value.profilePicture}?t=${avatarVersion.value}`
})

const usernamePending = computed(() => form.value.username.trim() !== original.value.username)

const hasUnsavedChanges = computed(() => {
  return (
    usernamePending.value ||
    pendingAvatarBlob.value !== null ||
    form.value.email !== original.value.email ||
    emailVerificationVisible.value
  )
})

const emailCode = computed(() => emailCodeDigits.value.join(''))

const formattedTimer = computed(() => {
  const m = String(Math.floor(timer.value / 60)).padStart(2, '0')
  const s = String(timer.value % 60).padStart(2, '0')
  return `${m}:${s}`
})

const hasUppercase = computed(() => /[A-Z]/.test(pass.value.new))
const hasNumber = computed(() => /\d/.test(pass.value.new))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass.value.new))
const passwordsMatch = computed(() => pass.value.new === pass.value.confirm && pass.value.new !== '')
const isPasswordValid = computed(() =>
  pass.value.new.length >= 8 && hasUppercase.value && hasNumber.value && hasSpecial.value && passwordsMatch.value
)

const onFileSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    previewUrl.value = ev.target.result
    cropperVisible.value = true
  }
  reader.readAsDataURL(file)
}

const onCropChange = ({ canvas }) => {
  croppedCanvas.value = canvas
}

const applyCrop = () => {
  if (!croppedCanvas.value) return
  croppedCanvas.value.toBlob((blob) => {
    pendingAvatarBlob.value = blob
    pendingAvatarUrl.value = URL.createObjectURL(blob)
    cropperVisible.value = false
  }, 'image/jpeg', 0.95)
}

const fetchUser = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    user.value = data
    original.value = { username: data.username, email: data.email, profilePicture: data.profilePicture || '' }
    form.value = { username: data.username, email: data.email }
  } catch (err) {
    profileError.value = 'Failed to load profile'
  }
}

const toggleEdit = async (field) => {
  editing.value[field] = !editing.value[field]
  if (editing.value[field]) {
    await nextTick()
    const input = field === 'username' ? usernameInput.value : emailInput.value
    input?.focus()
  }
}

const updateProfile = async () => {
  profileError.value = ''
  profileSuccess.value = ''
  saving.value = true

  const formData = new FormData()
  if (usernamePending.value) {
    formData.append('username', form.value.username.trim())
  }
  if (pendingAvatarBlob.value) {
    formData.append('profilePicture', pendingAvatarBlob.value, 'avatar.jpg')
  }

  try {
    const res = await axios.put(`${API_BASE}/me`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    if (res.data.token) localStorage.setItem('token', res.data.token)

    original.value.username = form.value.username.trim()
    if (res.data.user?.profilePicture) {
      original.value.profilePicture = res.data.user.profilePicture
    }

    pendingAvatarBlob.value = null
    pendingAvatarUrl.value = ''
    avatarVersion.value++

    await fetchUser()
    window.refreshUserProfile?.()

    editing.value.username = false
    profileSuccess.value = 'Profile updated successfully!'
    setTimeout(() => profileSuccess.value = '', 3000)
  } catch (err) {
    profileError.value = err.response?.data?.error || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

const requestEmailChange = async () => {
  profileError.value = ''
  emailChangeSuccess.value = ''
  requestingEmailChange.value = true

  try {
    await axios.post(`${API_BASE}/me/request-email-change`, {
      newEmail: form.value.email.trim()
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    pendingEmail.value = form.value.email.trim()
    emailVerificationVisible.value = true
    attemptsLeft.value = 3
    timer.value = 300
    emailCodeDigits.value = ['', '', '', '', '', '']
    emailCodeError.value = ''

    startTimer()
    emailChangeSuccess.value = 'Verification code sent!'
    setTimeout(() => emailChangeSuccess.value = '', 6000)
    nextTick(() => emailCodeInputs.value[0]?.focus())
  } catch (err) {
    profileError.value = err.response?.data?.error || 'Failed to send code'
  } finally {
    requestingEmailChange.value = false
  }
}

const resendCode = async () => {
  await requestEmailChange()
}

const verifyEmailChange = async (code) => {
  emailCodeError.value = ''

  try {
    const res = await axios.post(`${API_BASE}/me/verify-email-change`, { code }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    if (res.data.token) localStorage.setItem('token', res.data.token)

    await fetchUser()
    window.refreshUserProfile?.()
    stopTimer()
    emailVerificationVisible.value = false
    profileSuccess.value = 'Email changed successfully!'
    setTimeout(() => profileSuccess.value = '', 4000)
  } catch (err) {
    const msg = err.response?.data?.error || 'Invalid code'

    if (msg.includes('No attempts left') || msg.includes('No email change request')) {
      emailVerificationVisible.value = false
      stopTimer()
      emailCodeError.value = 'Verification failed. Please try again.'
      setTimeout(() => emailCodeError.value = '', 5000)
      return
    }

    const match = msg.match(/(\d+) attempt/)
    if (match) attemptsLeft.value = parseInt(match[1])

    emailCodeError.value = msg
    emailCodeDigits.value = ['', '', '', '', '', '']
    nextTick(() => emailCodeInputs.value[0]?.focus())
  }
}

const startTimer = () => {
  stopTimer()
  timerInterval = setInterval(() => {
    if (timer.value > 0) {
      timer.value--
    } else {
      stopTimer()
      emailVerificationVisible.value = false
      emailCodeError.value = 'Code expired. Please request a new one.'
      setTimeout(() => emailCodeError.value = '', 5000)
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = null
}

watch(emailCode, (newCode) => {
  if (newCode.length === 6 && emailVerificationVisible.value) {
    verifyEmailChange(newCode)
  }
})

const handleEmailCodeInput = (e, index) => {
  let value = e.target.value.replace(/[^0-9]/g, '')
  if (value.length > 1) value = value[0]
  emailCodeDigits.value[index] = value
  if (value && index < 5) nextTick(() => emailCodeInputs.value[index + 1]?.focus())
}

const handleEmailCodeKeydown = (e, index) => {
  if (e.key === 'Backspace' && !emailCodeDigits.value[index] && index > 0) {
    nextTick(() => emailCodeInputs.value[index - 1]?.focus())
  }
}

const setupRouterGuard = () => {
  router.beforeEach((to, from, next) => {
    if (hasUnsavedChanges.value && to.path !== from.path) {
      confirmLeave.value = true
      next(false)
    } else {
      next()
    }
  })
}

const forceLeave = () => {
  confirmLeave.value = false
  window.location.href = 'http://localhost:5173/'
}

const stay = () => {
  confirmLeave.value = false
}

onMounted(() => {
  fetchUser()
  setupRouterGuard()
})

onBeforeUnmount(() => {
  stopTimer()
})

const changePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  changing.value = true

  if (!passwordsMatch.value) {
    passwordError.value = 'Passwords do not match'
    changing.value = false
    return
  }

  try {
    await axios.post(`${API_BASE}/me/change-password`, {
      currentPassword: pass.value.current,
      newPassword: pass.value.new
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    passwordSuccess.value = 'Password changed successfully!'
    pass.value = { current: '', new: '', confirm: '' }
    setTimeout(() => passwordSuccess.value = '', 4000)
  } catch (err) {
    passwordError.value = err.response?.data?.error || 'Wrong current password'
  } finally {
    changing.value = false
  }
}

const deleteMyAccount = async () => {
  if (!deletePassword.value) return

  deleting.value = true
  deleteError.value = ''

  try {
    await axios.post(`${API_BASE}/me/delete-account`, {
      password: deletePassword.value
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    localStorage.removeItem('token')
    window.location.href = '/'
  } catch (err) {
    deleteError.value = err.response?.data?.error || 'Wrong password'
  } finally {
    deleting.value = false
  }
}

const usernameInput = ref(null)
const emailInput = ref(null)
const emailCodeInputs = ref([])
</script>

<style scoped>
.cropper-container { height: 420px; background: #111; border-radius: 20px; overflow: hidden; }
.cropper { height: 100%; }
.auth-input { @apply w-full px-5 py-5 rounded-xl border border-gray-300 focus:border-primary focus:outline-none text-xl transition; }
.auth-input:disabled { @apply bg-gray-50 text-gray-600 cursor-not-allowed; }
.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.password-wrapper { @apply relative; }
.eye-btn { @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors; }
.eye-icon { @apply w-7 h-7; }
.error-text { @apply text-red-600 font-bold text-xl; }
.code-inputs { @apply flex justify-center gap-4 my-8; }
.code-box { @apply w-14 h-14 text-center text-3xl font-bold rounded-xl border-2 border-gray-300 focus:border-primary focus:outline-none transition-all; }
.modal-overlay { @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50; }
.modal { @apply bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl; }
.modal-title { @apply text-2xl font-bold text-primary mb-4; }
.modal-text { @apply text-gray-700 mb-8; }
.modal-buttons { @apply flex gap-4 justify-center; }
.btn-danger { @apply bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg; }
.btn-cancel { @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-xl shadow-lg; }
</style>
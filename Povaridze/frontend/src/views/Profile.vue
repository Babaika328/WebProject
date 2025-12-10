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
          @blur="handleBlur('username', $event)"
          class="auth-input text-xl pr-16"
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
          @blur="handleBlur('email', $event)"
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
          Email change requires verification (admin only for now)
        </small>
      </div>

      <p v-if="profileError" class="error-text text-center mb-4">{{ profileError }}</p>
      <p v-if="profileSuccess" class="text-green-600 font-bold text-xl text-center mb-6">{{ profileSuccess }}</p>

      <button
        @click="updateProfile"
        :disabled="saving || !hasUnsavedChanges"
        class="auth-btn primary w-full text-xl py-5 mb-12"
      >
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>

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
          <router-link to="/forgot-password?from=profile" class="text-primary hover:underline text-sm font-medium">
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import axios from 'axios'

const API_BASE = 'http://localhost:5000/api'

const user = ref({})
const original = ref({ username: '', email: '', profilePicture: '' })
const form = ref({ username: '', email: '' })
const editing = ref({ username: false, email: false })

const pendingAvatarBlob = ref(null)
const pendingAvatarUrl = ref('')
const croppedCanvas = ref(null)

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

const avatarUrl = computed(() => {
  if (!user.value.profilePicture) return ''
  return `http://localhost:5000/avatars/${user.value.profilePicture}?t=${avatarVersion.value}`
})

const hasUnsavedChanges = computed(() => {
  return (
    form.value.username !== original.value.username ||
    form.value.email !== original.value.email ||
    pendingAvatarBlob.value !== null
  )
})

const hasUppercase = computed(() => /[A-Z]/.test(pass.value.new))
const hasNumber = computed(() => /\d/.test(pass.value.new))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass.value.new))
const passwordsMatch = computed(() => pass.value.new === pass.value.confirm && pass.value.new !== '')
const isPasswordValid = computed(() => {
  return pass.value.new.length >= 8 && hasUppercase.value && hasNumber.value && hasSpecial.value && passwordsMatch.value
})

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
    original.value = {
      username: data.username,
      email: data.email,
      profilePicture: data.profilePicture || ''
    }
    form.value = { username: data.username, email: data.email }
    profileError.value = ''
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

const handleBlur = (field, event) => {
  const related = event.relatedTarget
  if (related && related.tagName === 'BUTTON' && related.textContent.includes('Save')) return
  editing.value[field] = false
  form.value[field] = original.value[field]
}

const updateProfile = async () => {
  profileError.value = ''
  profileSuccess.value = ''
  saving.value = true

  const formData = new FormData()
  if (form.value.username !== original.value.username) formData.append('username', form.value.username.trim())
  if (form.value.email !== original.value.email) formData.append('email', form.value.email.trim())
  if (pendingAvatarBlob.value) formData.append('profilePicture', pendingAvatarBlob.value, 'avatar.jpg')

  try {
    const res = await axios.put(`${API_BASE}/me`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    if (res.data.token) localStorage.setItem('token', res.data.token)

    original.value.username = form.value.username
    original.value.email = form.value.email
    if (res.data.user?.profilePicture) original.value.profilePicture = res.data.user.profilePicture

    pendingAvatarBlob.value = null
    pendingAvatarUrl.value = ''
    avatarVersion.value++

    await fetchUser()
    editing.value = { username: false, email: false }

    window.refreshUserProfile?.()

    profileSuccess.value = 'Profile updated successfully!'
    setTimeout(() => profileSuccess.value = '', 2000)
  } catch (err) {
    profileError.value = err.response?.data?.error || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

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

const usernameInput = ref(null)
const emailInput = ref(null)

onMounted(fetchUser)
</script>

<style scoped>
.cropper-container { height: 420px; background: #111; border-radius: 20px; overflow: hidden; }
.cropper { height: 100%; }
.auth-input { @apply w-full px-6 py-5 rounded-xl border border-gray-300 focus:border-primary focus:outline-none text-xl transition; }
.auth-input:disabled { @apply bg-gray-50 text-gray-600 cursor-not-allowed; }
.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.password-wrapper { @apply relative; }
.eye-btn { @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors; }
.eye-icon { @apply w-7 h-7; }
.error-text { @apply text-red-600 font-bold text-xl; }
</style>
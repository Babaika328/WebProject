<template>
  <div class="container py-12">
    <h1 class="text-5xl font-bold text-center text-primary mb-12">
      Editing: {{ targetUser.username || 'User' }}
    </h1>

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
              :min-scale="1"
              :max-scale="3"
              :wheel-resize="true"
              :wheel-scale-factor="0.12"
              class="cropper"
            />
          </div>
          <div class="flex gap-6 mt-8">
            <button @click="cropperVisible = false" class="auth-btn secondary flex-1 text-xl py-4">Cancel</button>
            <button @click="applyCrop" class="auth-btn primary flex-1 text-xl py-4">Apply</button>
          </div>
        </div>
      </div>

      <div class="text-center mb-12">
        <div class="relative inline-block">
          <img
            v-if="pendingAvatarUrl || targetUser.profilePicture"
            :src="pendingAvatarUrl || `http://localhost:5000/avatars/${targetUser.profilePicture}`"
            alt="Avatar"
            class="w-40 h-40 rounded-full object-cover border-8 shadow-2xl transition-all duration-300"
            :class="pendingAvatarUrl ? 'border-green-500 border-dashed animate-pulse' : 'border-primary'"
          />
          <div v-else class="w-40 h-40 rounded-full bg-primary text-white text-7xl font-black flex items-center justify-center border-8 border-primary shadow-2xl">
            {{ targetUser.username?.[0]?.toUpperCase() || '?' }}
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
        />
        <button @click="toggleEdit('email')" class="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700 transition">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <div v-if="currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN'" class="mb-12">
        <label class="block text-xl font-bold mb-4 text-left">Role</label>
        <select v-model="form.role" class="auth-input text-xl">
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
          <option v-if="currentUser.role === 'SUPERADMIN'" value="SUPERADMIN">SUPERADMIN</option>
        </select>
      </div>

      <h3 class="text-3xl font-bold text-primary text-center mb-8">Change Password (optional)</h3>

      <div class="password-wrapper mb-6">
        <input v-model="pass.new" :type="showNew ? 'text' : 'password'" placeholder="New password" class="auth-input text-xl" />
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

      <div class="password-wrapper mb-6">
        <input v-model="pass.confirm" :type="showConfirm ? 'text' : 'password'" placeholder="Confirm new password" class="auth-input text-xl" />
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

      <div class="password-requirements mb-12">
        <ul class="text-left space-y-3 text-lg">
          <li :class="pass.new.length >= 8 ? 'text-green-600 font-bold' : 'text-gray-500'">
            8+ characters
          </li>
          <li :class="hasUppercase ? 'text-green-600 font-bold' : 'text-gray-500'">
            One uppercase letter
          </li>
          <li :class="hasNumber ? 'text-green-600 font-bold' : 'text-gray-500'">
            One number
          </li>
          <li :class="hasSpecial ? 'text-green-600 font-bold' : 'text-gray-500'">
            One special character
          </li>
          <li :class="passwordsMatch ? 'text-green-600 font-bold' : 'text-gray-500'">
            Passwords match
          </li>
        </ul>
      </div>

      <p v-if="error" class="error-text text-center mb-4">{{ error }}</p>
      <p v-if="success" class="text-green-600 font-bold text-xl text-center mb-6">{{ success }}</p>

      <button @click="saveUser" :disabled="saving" class="auth-btn primary w-full text-xl py-5">
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>

      <button @click="handleBack" class="auth-btn secondary w-full mt-4 text-xl py-5">
        Back to Admin Panel
      </button>
    </div>

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
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const targetUser = ref({})
const currentUser = ref({})
const original = ref({ username: '', email: '', role: '' })
const form = ref({ username: '', email: '', role: 'USER' })
const editing = ref({ username: false, email: false })

const pass = ref({ new: '', confirm: '' })
const showNew = ref(false)
const showConfirm = ref(false)

const pendingAvatarBlob = ref(null)
const pendingAvatarUrl = ref('')
const previewUrl = ref('')
const cropperVisible = ref(false)
const cropper = ref(null)

const saving = ref(false)
const error = ref('')
const success = ref('')

const confirmLeave = ref(false)

const API_BASE = 'http://localhost:5000/api'

const usernamePending = computed(() => form.value.username.trim() !== original.value.username)
const emailPending = computed(() => form.value.email !== original.value.email)
const rolePending = computed(() => form.value.role !== original.value.role)
const hasPasswordChange = computed(() => pass.value.new !== '')

const hasUnsavedChanges = computed(() => {
  return usernamePending.value || emailPending.value || rolePending.value || pendingAvatarBlob.value !== null || hasPasswordChange.value
})

const hasUppercase = computed(() => /[A-Z]/.test(pass.value.new))
const hasNumber = computed(() => /\d/.test(pass.value.new))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass.value.new))
const passwordsMatch = computed(() => pass.value.new === pass.value.confirm && pass.value.new !== '')

onMounted(async () => {
  await fetchCurrentUser()
  await fetchTargetUser()
})

const fetchCurrentUser = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    currentUser.value = data
  } catch {
    router.push('/login')
  }
}

const fetchTargetUser = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const user = data.find(u => u.id === parseInt(route.params.id))
    if (!user) throw new Error('User not found')

    targetUser.value = user
    original.value = { username: user.username, email: user.email, role: user.role }
    form.value = { username: user.username, email: user.email, role: user.role }
  } catch (err) {
    error.value = err.message || 'Failed to load user'
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

const applyCrop = () => {
  const { canvas } = cropper.value.getResult()
  if (canvas) {
    canvas.toBlob((blob) => {
      pendingAvatarBlob.value = blob
      pendingAvatarUrl.value = URL.createObjectURL(blob)
      cropperVisible.value = false
    }, 'image/jpeg', 0.95)
  }
}

const saveUser = async () => {
  saving.value = true
  error.value = ''
  success.value = ''

  const formData = new FormData()

  if (usernamePending.value) formData.append('username', form.value.username.trim())
  if (emailPending.value) formData.append('email', form.value.email.trim())
  if (rolePending.value) formData.append('role', form.value.role)
  if (pendingAvatarBlob.value) formData.append('profilePicture', pendingAvatarBlob.value)
  if (pass.value.new && passwordsMatch.value) formData.append('newPassword', pass.value.new)

  try {
    await axios.put(`${API_BASE}/admin/users/${targetUser.value.id}`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    success.value = 'User updated successfully!'

    targetUser.value.username = form.value.username.trim()
    targetUser.value.email = form.value.email.trim()
    targetUser.value.role = form.value.role

    pendingAvatarBlob.value = null
    pendingAvatarUrl.value = ''
    pass.value = { new: '', confirm: '' }
    editing.value = { username: false, email: false }

    original.value = {
      username: targetUser.value.username,
      email: targetUser.value.email,
      role: targetUser.value.role
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to update user'
  } finally {
    saving.value = false
  }
}

const handleBack = () => {
  if (hasUnsavedChanges.value) {
    confirmLeave.value = true
  } else {
    router.push('/admin')
  }
}

const forceLeave = () => {
  confirmLeave.value = false
  router.push('/admin')
}

const stay = () => {
  confirmLeave.value = false
}

const usernameInput = ref(null)
const emailInput = ref(null)
</script>

<style scoped>
.cropper-container { height: 420px; background: #111; border-radius: 20px; overflow: hidden; }
.cropper { height: 100%; }
.auth-input { @apply w-full px-6 py-5 rounded-xl border border-gray-300 focus:border-primary focus:outline-none text-xl transition; }
.auth-btn { @apply w-full py-5 rounded-xl font-bold text-xl transition-all shadow-lg hover:shadow-xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.password-wrapper { @apply relative; }
.eye-btn { @apply absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors; }
.eye-icon { @apply w-7 h-7; }
.error-text { @apply text-red-600 font-bold text-xl; }
.password-requirements { @apply text-left space-y-3 text-lg; }
.modal-overlay { @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50; }
.modal { @apply bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl; }
.modal-title { @apply text-3xl font-bold text-primary mb-4; }
.modal-text { @apply text-gray-700 mb-8; }
.modal-buttons { @apply flex gap-6 justify-center; }
.btn-danger { @apply bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg; }
.btn-cancel { @apply bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-4 px-10 rounded-xl shadow-lg; }
</style>
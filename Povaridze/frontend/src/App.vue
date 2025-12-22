<template>
  <div id="app">
    <header class="header">
      <router-link to="/" class="header-left">
        <img src="http://localhost:5000/images/logo.png" alt="Povaridze" class="logo" />
        <h1 class="header-title">Povaridze</h1>
      </router-link>

      <div v-if="user" class="user-menu-wrapper"
           @mouseenter="showDropdown = true"
           @mouseleave="showDropdown = false">

        <div class="avatar">
          <img v-if="user.profilePicture" 
               :src="avatarUrl" 
               class="w-full h-full rounded-full object-cover" 
               alt="Avatar" />
          <span v-else>
            {{ user.username?.[0]?.toUpperCase() || '?' }}
          </span>
        </div>

        <transition name="fade">
          <div v-if="showDropdown" class="dropdown">
            <div class="dropdown-item username font-bold text-lg">
              {{ user.username }}
            </div>
            <div @click="router.push('/profile')" class="dropdown-item font-bold cursor-pointer">
              Profile
            </div>
            <div v-if="user.role === 'ADMIN' || user.role === 'SUPERADMIN'"  @click="router.push('/admin')" class="dropdown-item font-bold text-primary cursor-pointer">
              Admin
            </div>
            <div @click="router.push('/my-recipes')" class="dropdown-item font-bold cursor-pointer">
              My Recipes
            </div>
            <button @click="confirmLogout = true" class="dropdown-item logout-btn">
              Sign Out
            </button>
          </div>
        </transition>
      </div>

      <div v-else class="auth-buttons">
        <router-link to="/login" class="auth-btn login">Login</router-link>
        <router-link to="/signup" class="auth-btn signup">Sign Up</router-link>
      </div>
    </header>

    <transition name="modal">
      <div v-if="confirmLogout" class="modal-overlay" @click="confirmLogout = false">
        <div class="modal" @click.stop>
          <h3 class="modal-title">Sign Out?</h3>
          <p class="modal-text">Are you sure you want to sign out?</p>
          <div class="modal-buttons">
            <button @click="logout" class="btn-danger">Sign Out</button>
            <button @click="confirmLogout = false" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </transition>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const user = ref(null)
const avatarVersion = ref(0)
const showDropdown = ref(false)
const confirmLogout = ref(false)

const avatarUrl = computed(() => {
  if (!user.value?.profilePicture) return ''
  return `http://localhost:5000/avatars/${user.value.profilePicture}?t=${avatarVersion.value}`
})

const fetchUser = async () => {
  const token = localStorage.getItem('token')
  if (!token) {
    user.value = null
    return
  }

  try {
    const { data } = await axios.get('http://localhost:5000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    user.value = data
  } catch (err) {
    console.error('Failed to fetch user:', err)
    localStorage.removeItem('token')
    user.value = null
  }
}

const logout = () => {
  localStorage.removeItem('token')
  user.value = null
  confirmLogout.value = false
  showDropdown.value = false
  router.push('/')
}

window.refreshUserProfile = () => {
  avatarVersion.value += 1
  fetchUser()
}

onMounted(fetchUser)

watch(() => localStorage.getItem('token'), (newToken) => {
  if (newToken) fetchUser()
  else user.value = null
})

window.addEventListener('focus', fetchUser)
</script>

<style scoped>
.header {
  @apply fixed top-0 left-0 w-full h-24 bg-white shadow-md z-50 flex items-center justify-between px-10 border-b border-gray-200;
}
.header-left { @apply flex items-center gap-10; }
.logo { @apply h-20 w-auto; }
.header-title { @apply text-5xl font-bold text-primary; }

.auth-buttons { @apply flex gap-6; }
.auth-btn {
  @apply px-8 py-3 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg;
}
.login { @apply bg-gray-100 text-gray-800 hover:bg-gray-200; }
.signup { @apply bg-primary text-white hover:bg-red-700; }

.user-menu-wrapper { @apply relative; }
.avatar {
  @apply w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer shadow-xl hover:bg-red-700 transition-all;
}
.dropdown {
  @apply absolute top-full right-0 mt-0 bg-white rounded-2xl shadow-2xl py-4 min-w-48 border border-gray-200;
}
.dropdown-item {
  @apply px-6 py-3 text-left hover:bg-gray-50 transition w-full;
}
.username { @apply text-gray-800 font-medium; }
.logout-btn { @apply text-red-600 font-bold hover:bg-red-50; }

.modal-overlay { @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50; }
.modal { @apply bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl; }
.modal-title { @apply text-2xl font-bold text-primary mb-4; }
.modal-text { @apply text-gray-700 mb-8; }
.modal-buttons { @apply flex gap-4 justify-center; }
.btn-danger { @apply bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg; }
.btn-cancel { @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-xl shadow-lg; }

.fade-enter-active, .fade-leave-active { @apply transition-all duration-300; }
.fade-enter-from, .fade-leave-to { @apply opacity-0 transform translate-y-4; }
.modal-enter-active, .modal-leave-active { @apply transition-all duration-300; }
.modal-enter-from, .modal-leave-to { @apply opacity-0 transform scale-90; }

.main-content { @apply pt-32 min-h-screen bg-gray-50; }
</style>
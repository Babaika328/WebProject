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
          {{ user.username[0].toUpperCase() }}
        </div>

        <transition name="fade">
          <div v-if="showDropdown" class="dropdown">
            <div class="dropdown-item username">{{ user.username }}</div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const user = ref(null)
const showDropdown = ref(false)
const confirmLogout = ref(false)

const checkAuth = () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      user.value = { username: payload.username || 'User' }
    } catch {
      localStorage.removeItem('token')
      user.value = null
    }
  } else {
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

onMounted(() => {
  checkAuth()
  window.addEventListener('storage', checkAuth)
  router.afterEach(checkAuth)
})
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

.user-menu-wrapper {
  @apply relative;
}

.avatar {
  @apply w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer shadow-xl hover:bg-red-700 transition-all;
}

.dropdown {
  @apply absolute top-full right-0 mt-0 bg-white rounded-2xl shadow-2xl py-4 min-w-48 border border-gray-200 z-50;
}

.dropdown-item {
  @apply px-6 py-3 text-left hover:bg-gray-50 transition w-full text-left;
}
.username { @apply text-gray-800 font-medium; }
.logout-btn { @apply text-red-600 font-bold hover:bg-red-50; }

.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}
.modal {
  @apply bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl;
}
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
<template>
  <div class="container py-12">
    <h1 class="text-5xl font-bold text-center text-primary mb-12">Admin Panel</h1>

    <div class="max-w-3xl mx-auto mb-16">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by username or email..."
        class="auth-input text-xl w-full px-10 py-5 rounded-2xl shadow-2xl focus:shadow-3xl transition"
      />
    </div>

    <div class="max-w-7xl mx-auto bg-white rounded-3xl shadow-2xl p-12">
      <div v-if="loading" class="text-center text-3xl py-32">Loading users...</div>
      <div v-else-if="filteredUsers.length === 0" class="text-center text-3xl text-gray-600 py-32">
        {{ searchQuery ? 'No users found for this search' : 'No users found' }}
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 justify-center">
        <div
          v-for="u in filteredUsers"
          :key="u.id"
          class="bg-gray-50 rounded-3xl p-12 shadow-2xl hover:shadow-3xl transition-all duration-500 max-w-lg mx-auto flex flex-col"
        >
          <div class="flex flex-col items-center text-center flex-grow">
            <div class="relative mb-10">
              <img
                v-if="u.profilePicture"
                :src="`http://localhost:5000/avatars/${u.profilePicture}`"
                class="w-44 h-44 rounded-full object-cover border-8 border-primary shadow-2xl"
                alt="Avatar"
              />
              <div
                v-else
                class="w-44 h-44 rounded-full bg-primary text-white text-7xl font-black flex items-center justify-center border-8 border-primary shadow-2xl"
              >
                {{ u.username[0].toUpperCase() }}
              </div>
            </div>

            <h3 class="text-3xl font-bold text-gray-800 mb-4">{{ u.username }}</h3>
            <p class="text-gray-600 text-lg mb-8 break-all">{{ u.email }}</p>

            <span
              class="inline-block px-10 py-4 rounded-full text-white font-bold text-xl shadow-xl mb-12"
              :class="{
                'bg-green-600': u.role === 'SUPERADMIN',
                'bg-blue-600': u.role === 'ADMIN',
                'bg-gray-600': u.role === 'USER'
              }"
            >
              {{ u.role }}
            </span>
          </div>

          <div class="flex flex-col gap-6 mt-auto">
            <button
              @click="editUser(u)"
              :disabled="!canEdit(u)"
              :class="canEdit(u) ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'"
              class="w-full py-5 text-white font-bold rounded-2xl shadow-2xl transition text-xl"
            >
              Edit User
            </button>

            <button
              @click="confirmDelete(u)"
              :disabled="!canDelete(u)"
              :class="canDelete(u) ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'"
              class="w-full py-5 text-white font-bold rounded-2xl shadow-2xl transition text-xl"
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="modal">
      <div v-if="deleteConfirm" class="modal-overlay" @click.self="deleteConfirm = null">
        <div class="modal">
          <h3 class="modal-title text-red-600">Delete User?</h3>
          <p class="modal-text">
            Are you sure you want to delete <strong>{{ deleteConfirm.username }}</strong>?<br />
            This action cannot be undone.
          </p>
          <div class="modal-buttons">
            <button @click="deleteUser" class="btn-danger">Delete</button>
            <button @click="deleteConfirm = null" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const allUsers = ref([])
const loading = ref(true)
const currentUserId = ref(null)
const currentUserRole = ref('')
const deleteConfirm = ref(null)
const searchQuery = ref('')

const filteredUsers = computed(() => {
  let result = allUsers.value

  result = result.filter(u => u.id !== currentUserId.value)

  if (!searchQuery.value.trim()) return result

  const query = searchQuery.value.toLowerCase()
  return result.filter(u =>
    u.username.toLowerCase().includes(query) ||
    u.email.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  try {
    const meRes = await axios.get('http://localhost:5000/api/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    currentUserId.value = meRes.data.id
    currentUserRole.value = meRes.data.role

    const { data } = await axios.get('http://localhost:5000/api/admin/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    allUsers.value = data
  } catch (err) {
    alert('Access denied or error loading users')
    router.push('/')
  } finally {
    loading.value = false
  }
})

const canEdit = (user) => {
  if (currentUserRole.value === 'SUPERADMIN') return true
  if (currentUserRole.value === 'ADMIN') return user.role === 'USER'
  return false
}

const canDelete = (user) => {
  if (currentUserRole.value === 'SUPERADMIN') return true
  if (currentUserRole.value === 'ADMIN') return user.role === 'USER'
  return false
}

const editUser = (user) => {
  if (canEdit(user)) {
    router.push(`/admin/edit/${user.id}`)
  }
}

const confirmDelete = (user) => {
  if (canDelete(user)) {
    deleteConfirm.value = user
  }
}

const deleteUser = async () => {
  if (!deleteConfirm.value) return

  try {
    await axios.delete(`http://localhost:5000/api/admin/users/${deleteConfirm.value.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    allUsers.value = allUsers.value.filter(u => u.id !== deleteConfirm.value.id)
    deleteConfirm.value = null
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete user')
  }
}
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}
.modal {
  @apply bg-white rounded-3xl p-12 max-w-lg w-full text-center shadow-3xl;
}
.modal-title {
  @apply text-4xl font-bold mb-6;
}
.modal-text {
  @apply text-gray-700 mb-10 text-xl;
}
.modal-buttons {
  @apply flex gap-8 justify-center;
}
.btn-danger {
  @apply bg-red-600 hover:bg-red-700 text-white font-bold py-5 px-12 rounded-2xl shadow-2xl text-xl;
}
.btn-cancel {
  @apply bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-5 px-12 rounded-2xl shadow-2xl text-xl;
}
</style>
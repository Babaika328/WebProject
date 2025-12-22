<template>
  <div class="container recipe-detail py-12">
    <div v-if="loading" class="text-center py-32 text-3xl">Loading...</div>
    <div v-else-if="error" class="text-center text-red-600 py-32 text-2xl">{{ error }}</div>
    <div v-else>
      <h1 class="text-5xl md:text-6xl font-bold text-center text-primary mb-12">
        {{ recipe.title }}
      </h1>
      <p class="text-center text-2xl text-gray-700 mb-12">
        <strong>by</strong> {{ recipe.user?.username || 'Povaridze' }}
      </p>

      <div class="text-center mb-16">
        <img
          :src="recipeImage"
          :alt="recipe.title"
          class="w-96 h-96 mx-auto rounded-3xl shadow-2xl object-cover"
          @error="handleImageError"
        />
      </div>

      <div v-if="!isDefault" class="flex justify-center gap-12 mb-20">
        <button @click="vote('UP')" :disabled="!isAuthenticated || voting" class="vote-btn up">
          Up {{ upvotes }}
        </button>
        <button @click="vote('DOWN')" :disabled="!isAuthenticated || voting" class="vote-btn down">
          Down {{ downvotes }}
        </button>
      </div>

      <div v-if="!isDefault && (isOwner || isAdmin)" class="text-center mb-20">
        <button @click="startEdit" class="auth-btn primary mr-8 px-10 py-4 text-xl">
          Edit Recipe
        </button>
        <button @click="confirmDeleteRecipe" class="auth-btn bg-red-600 hover:bg-red-700 px-10 py-4 text-xl">
          Delete Recipe
        </button>
      </div>

      <div class="max-w-4xl mx-auto space-y-32 mb-32">
        <div v-if="recipe.youtube">
          <h3 class="text-4xl font-bold text-primary text-center mb-10">Video Tutorial</h3>
          <div class="flex justify-center">
            <iframe
              :src="youtubeEmbedUrl"
              class="w-full max-w-3xl aspect-video rounded-3xl shadow-3xl"
              frameborder="0"
              allowfullscreen
            ></iframe>
          </div>
        </div>

        <div>
          <h3 class="text-4xl font-bold text-primary text-center mb-10">Ingredients</h3>
          <ul class="list-disc list-inside text-xl space-y-4 text-gray-800">
            <li v-for="ing in parsedIngredients" :key="ing">{{ ing }}</li>
          </ul>
        </div>

        <div>
          <h3 class="text-4xl font-bold text-primary text-center mb-10">Instructions</h3>
          <ol class="space-y-6 text-xl text-gray-800 leading-relaxed">
            <li v-for="(step, index) in parsedInstructions" :key="index" class="flex">
              <span class="font-bold text-green-600 text-2xl mr-6 flex-shrink-0">{{ index + 1 }}.</span>
              <span>{{ step }}</span>
            </li>
          </ol>
        </div>
      </div>

      <div v-if="!isDefault" class="max-w-3xl mx-auto mb-20">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">
          Comments ({{ recipe.comments?.length || 0 }})
        </h3>

        <div v-if="recipe.comments?.length" class="space-y-6">
          <div
            v-for="comment in recipe.comments"
            :key="comment.id"
            class="bg-white rounded-2xl shadow-md p-6 flex gap-5 relative"
          >
            <img
              :src="comment.user.profilePicture
                ? `http://localhost:5000/avatars/${comment.user.profilePicture}`
                : 'http://localhost:5000/images/default-avatar.png'"
              class="w-14 h-14 rounded-full object-cover border"
              alt="Avatar"
            />

            <div class="flex-1">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <p class="font-semibold text-lg text-primary">
                    {{ comment.user.username }}
                  </p>
                  <p class="text-sm text-gray-400">
                    {{ formatDate(comment.createdAt) }}
                  </p>
                </div>

                <div
                  v-if="isCommentOwner(comment) || isAdmin"
                  class="flex gap-4"
                >
                  <button
                    @click="startEditComment(comment)"
                    class="text-green-600 hover:text-green-800 transition"
                    title="Edit"
                  >
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <button
                    @click="confirmDeleteComment(comment.id)"
                    class="text-red-600 hover:text-red-800 transition"
                    title="Delete"
                  >
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="editingComment?.id === comment.id" class="mt-4">
                <textarea
                  v-model="editingComment.text"
                  rows="3"
                  class="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                ></textarea>

                <div class="flex justify-end gap-3 mt-3">
                  <button @click="cancelCommentEdit" class="auth-btn secondary px-5 py-2">
                    Cancel
                  </button>
                  <button @click="saveCommentEdit" class="auth-btn primary px-5 py-2">
                    Save
                  </button>
                </div>
              </div>

              <div v-else>
                <p class="text-gray-700 text-lg">
                  {{ comment.text }}
                </p>

                <p
                  v-if="comment.updatedAt && comment.updatedAt !== comment.createdAt"
                  class="text-sm text-gray-400 italic mt-1"
                >
                  (edited)
                </p>
              </div>
            </div>
          </div>
        </div>

        <p v-else class="text-center text-gray-500 text-xl">
          No comments yet. Be the first!
        </p>

        <div v-if="isAuthenticated" class="mt-12">
          <textarea
            v-model="newComment"
            placeholder="Write a comment..."
            rows="4"
            class="w-full p-5 text-lg border rounded-2xl focus:ring-2 focus:ring-green-500"
          ></textarea>

          <div class="flex justify-end mt-4">
            <button
              @click="addComment"
              :disabled="!newComment.trim() || commenting"
              class="auth-btn primary px-10 py-4 text-lg"
            >
              {{ commenting ? 'Posting...' : 'Post comment' }}
            </button>
          </div>
        </div>

        <p v-else class="text-center text-gray-600 mt-8">Log in to comment</p>
      </div>

      <div v-if="editingRecipe" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-10 max-w-2xl w-full max-h-screen overflow-y-auto shadow-3xl">
          <h2 class="text-4xl font-bold text-primary mb-8 text-center">Edit Recipe</h2>
          <form @submit.prevent="saveRecipeEdit">
            <input v-model="editForm.title" placeholder="Title" class="auth-input mb-6 text-2xl" required />
            <textarea v-model="editForm.ingredients" placeholder="Ingredients (one per line)" class="auth-input mb-6" rows="8"></textarea>
            <textarea v-model="editForm.instructions" placeholder="Instructions (one step per line)" class="auth-input mb-6" rows="10"></textarea>
            <input v-model="editForm.youtube" placeholder="YouTube link (optional)" class="auth-input mb-8" />
            <div class="flex gap-6">
              <button type="button" @click="editingRecipe = false" class="auth-btn secondary flex-1 py-5 text-xl">
                Cancel
              </button>
              <button type="submit" :disabled="savingEdit" class="auth-btn primary flex-1 py-5 text-xl">
                {{ savingEdit ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="deleteModal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-3xl">
          <h3 class="text-3xl font-bold text-red-600 mb-6">Delete Recipe?</h3>
          <p class="text-gray-700 mb-8">This action cannot be undone.</p>
          <div class="flex gap-6">
            <button @click="deleteRecipe" :disabled="deleting" class="auth-btn bg-red-600 hover:bg-red-700 flex-1 py-5 text-xl">
              {{ deleting ? 'Deleting...' : 'Delete Forever' }}
            </button>
            <button @click="deleteModal = false" class="auth-btn secondary flex-1 py-5 text-xl">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div v-if="deleteCommentModal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-3xl">
          <h3 class="text-3xl font-bold text-red-600 mb-6">Delete Comment?</h3>
          <p class="text-gray-700 mb-8">This action cannot be undone.</p>
          <div class="flex gap-6">
            <button @click="executeDeleteComment" :disabled="deletingComment" class="auth-btn bg-red-600 hover:bg-red-700 flex-1 py-5 text-xl">
              {{ deletingComment ? 'Deleting...' : 'Delete' }}
            </button>
            <button @click="deleteCommentModal = false" class="auth-btn secondary flex-1 py-5 text-xl">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <button @click="$router.push(`/dish/${recipe.dish.idMeal}`)" class="back-button z-40">
        Back to Dish
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const recipe = ref(null)
const loading = ref(true)
const error = ref('')
const newComment = ref('')
const commenting = ref(false)
const voting = ref(false)

const API_BASE = 'http://localhost:5000/api'
const token = localStorage.getItem('token')
const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))

const isAuthenticated = computed(() => !!token)
const isDefault = computed(() => !!route.query.dishId)
const isOwner = computed(() => recipe.value?.userId === currentUser.value.id)
const isAdmin = computed(() => ['ADMIN', 'SUPERADMIN'].includes(currentUser.value.role))

const recipeImage = computed(() => {
  if (recipe.value?.image) return `http://localhost:5000/recipes/${recipe.value.image}`
  if (recipe.value?.dish?.thumb_file) return `http://localhost:5000/images/${recipe.value.dish.thumb_file}`
  return 'https://via.placeholder.com/700x700/e74c3c/ffffff?text=Delicious'
})

const handleImageError = (e) => {
  e.target.src = 'https://via.placeholder.com/700x700/e74c3c/ffffff?text=Delicious'
}

const parsedIngredients = computed(() => {
  if (!recipe.value?.ingredients) return []
  if (Array.isArray(recipe.value.ingredients)) return recipe.value.ingredients
  try {
    return JSON.parse(recipe.value.ingredients)
  } catch {
    return recipe.value.ingredients.split(/,|\n/).map(i => i.trim()).filter(Boolean)
  }
})

const parsedInstructions = computed(() => {
  if (!recipe.value?.instructions) return []
  return recipe.value.instructions.split('\n').map(s => s.trim()).filter(Boolean)
})

const youtubeEmbedUrl = computed(() => {
  if (!recipe.value?.youtube) return ''
  const match = recipe.value.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : ''
})

const upvotes = computed(() => recipe.value?.votes?.filter(v => v.type === 'UP').length || 0)
const downvotes = computed(() => recipe.value?.votes?.filter(v => v.type === 'DOWN').length || 0)

const isCommentOwner = (comment) => comment.user?.id === currentUser.value.id

const editingRecipe = ref(false)
const editForm = ref({})
const savingEdit = ref(false)

const startEdit = () => {
  editingRecipe.value = true
  editForm.value = {
    title: recipe.value.title,
    ingredients: Array.isArray(recipe.value.ingredients) ? recipe.value.ingredients.join('\n') : recipe.value.ingredients,
    instructions: recipe.value.instructions,
    youtube: recipe.value.youtube
  }
}

const saveRecipeEdit = async () => {
  savingEdit.value = true
  try {
    const formData = new FormData()
    formData.append('title', editForm.value.title)
    formData.append('ingredients', editForm.value.ingredients)
    formData.append('instructions', editForm.value.instructions)
    formData.append('youtube', editForm.value.youtube || '')

    const res = await axios.put(`${API_BASE}/recipes/${recipe.value.id}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    recipe.value = res.data
    editingRecipe.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update recipe')
  } finally {
    savingEdit.value = false
  }
}

const deleteModal = ref(false)
const deleting = ref(false)

const confirmDeleteRecipe = () => {
  deleteModal.value = true
}

const deleteRecipe = async () => {
  deleting.value = true
  try {
    await axios.delete(`${API_BASE}/recipes/${recipe.value.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    router.push('/dishes')
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete recipe')
  } finally {
    deleting.value = false
  }
}

const editingComment = ref(null)
const deleteCommentModal = ref(false)
const commentToDelete = ref(null)
const deletingComment = ref(false)

const startEditComment = (comment) => {
  editingComment.value = { ...comment }
}

const saveCommentEdit = async () => {
  try {
    const res = await axios.put(`${API_BASE}/comments/${editingComment.value.id}`, {
      text: editingComment.value.text
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const index = recipe.value.comments.findIndex(c => c.id === res.data.id)
    if (index !== -1) recipe.value.comments[index] = res.data
    editingComment.value = null
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update comment')
  }
}

const cancelCommentEdit = () => {
  editingComment.value = null
}

const confirmDeleteComment = (id) => {
  commentToDelete.value = id
  deleteCommentModal.value = true
}

const executeDeleteComment = async () => {
  deletingComment.value = true
  try {
    await axios.delete(`${API_BASE}/comments/${commentToDelete.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    recipe.value.comments = recipe.value.comments.filter(c => c.id !== commentToDelete.value)
    deleteCommentModal.value = false
    commentToDelete.value = null
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete comment')
  } finally {
    deletingComment.value = false
  }
}

const fetchRecipe = async () => {
  loading.value = true
  error.value = ''
  try {
    if (isDefault.value) {
      const dishId = route.query.dishId
      if (!dishId) {
        error.value = 'No dish specified'
        return
      }
      const { data } = await axios.get(`${API_BASE}/dishes/${dishId}`)
      recipe.value = {
        id: null,
        title: `${data.name} (Official)`,
        instructions: data.instructions || 'No instructions available.',
        ingredients: data.ingredients,
        youtube: data.youtube,
        image: null,
        user: { username: 'Povaridze' },
        dish: data,
        votes: [],
        comments: []
      }
    } else {
      const { data } = await axios.get(`${API_BASE}/recipes/${route.params.id}`)
      recipe.value = data
    }
  } catch (err) {
    console.error('Fetch error:', err)
    error.value = 'Recipe not found'
  } finally {
    loading.value = false
  }
}

const vote = async (type) => {
  if (!isAuthenticated.value) return alert('Log in to vote')
  voting.value = true
  try {
    await axios.post(`${API_BASE}/recipes/${recipe.value.id}/vote`, { type }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchRecipe()
  } catch {
    alert('Vote failed')
  } finally {
    voting.value = false
  }
}

const addComment = async () => {
  if (!newComment.value.trim()) return
  commenting.value = true
  try {
    const { data } = await axios.post(`${API_BASE}/recipes/${recipe.value.id}/comments`, {
      text: newComment.value.trim()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    recipe.value.comments.unshift(data)
    newComment.value = ''
  } catch {
    alert('Comment failed')
  } finally {
    commenting.value = false
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(fetchRecipe)
</script>

<style scoped>
.video-container { @apply flex justify-center mb-20; }
.vote-btn {
  @apply px-12 py-5 rounded-full font-bold text-white text-2xl shadow-2xl hover:shadow-3xl transition-all hover:scale-110;
}
.up { @apply bg-green-600 hover:bg-green-700; }
.down { @apply bg-red-600 hover:bg-red-700; }
.auth-btn {
  @apply rounded-2xl font-bold transition-all shadow-2xl hover:shadow-3xl;
}
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.back-button {
  @apply fixed top-36 right-6 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all z-40;
}
</style>
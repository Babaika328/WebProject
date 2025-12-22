<template>
  <div class="container py-12">
    <h1 class="text-5xl font-bold text-center text-primary mb-12">
      {{ isAdmin ? 'All Recipes (Admin)' : 'My Recipes' }}
    </h1>

    <div class="max-w-3xl mx-auto mb-12">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by title or dish name..."
        class="auth-input text-xl w-full px-10 py-5 rounded-2xl shadow-2xl focus:shadow-3xl transition"
      />
    </div>

    <div v-if="loading" class="text-center py-32 text-3xl">Loading...</div>
    <div v-else-if="error" class="text-center text-red-600 py-32 text-2xl">{{ error }}</div>
    <div v-else-if="filteredRecipes.length === 0" class="text-center text-gray-500 text-2xl py-32">
      {{ searchQuery ? 'No recipes found' : (isAdmin ? 'No recipes in the system yet.' : 'You haven\'t created any recipes yet.') }}
    </div>

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
      <div
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        class="bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl hover:-translate-y-4 relative"
      >
        <router-link :to="`/recipe/${recipe.id}`">
          <img
            :src="recipe.image ? `http://localhost:5000/recipes/${recipe.image}` : `http://localhost:5000/images/${recipe.dish.thumb_file}`"
            class="w-full h-64 object-cover"
            @error="$event.target.src = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=No+Image'"
            alt="Recipe"
          />
          <div class="p-6 text-center">
            <h3 class="text-2xl font-bold text-primary mb-2">{{ recipe.title }}</h3>
            <p class="text-lg text-gray-700 mb-1">for {{ recipe.dish.name }}</p>
            <p class="text-gray-600 mb-3">by {{ recipe.user.username }}</p>
            <div class="flex justify-center gap-6 text-lg">
              <span class="text-green-600 font-bold">↑ {{ recipe.upvotes }}</span>
              <span class="text-red-600 font-bold">↓ {{ recipe.downvotes }}</span>
            </div>
          </div>
        </router-link>

        <div class="absolute top-4 right-4 flex gap-3 bg-white rounded-full p-2 shadow-lg z-10">
          <button @click.stop="startEditRecipe(recipe)" class="text-green-600 hover:text-green-800 transition" title="Edit">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button @click.stop="confirmDeleteRecipe(recipe.id)" class="text-red-600 hover:text-red-800 transition" title="Delete">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="editingRecipe" class="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-4xl w-full max-h-screen overflow-y-auto">
        <h1 class="text-4xl font-bold text-center text-primary mb-4">
          Edit Recipe for:
        </h1>
        <h2 class="text-3xl font-bold text-center text-gray-800 mb-8">{{ currentDishName }}</h2>

        <div class="mb-8 text-center">
          <img
            :src="currentImagePreview || (currentRecipeImage ? `http://localhost:5000/recipes/${currentRecipeImage}` : `http://localhost:5000/images/${currentDishThumb}`)"
            class="w-80 h-80 mx-auto rounded-3xl shadow-2xl object-cover"
            alt="Current recipe image"
          />
          <button @click="triggerFileInput" class="auth-btn primary mt-6 px-8 py-4 text-xl">
            Change Image
          </button>
          <input type="file" ref="fileInput" @change="onFileChange" accept="image/*" class="hidden" />
        </div>

        <div v-if="cropperVisible" class="mb-8">
          <div class="cropper-container">
            <Cropper
              ref="cropper"
              class="cropper"
              :src="imageSrc"
              :stencil-props="{ aspectRatio: 1 }"
            />
          </div>
          <div class="flex justify-center gap-6 mt-6">
            <button @click="cropImage" class="auth-btn primary px-8 py-4 text-xl">
              Crop & Use
            </button>
            <button @click="cancelCrop" class="auth-btn secondary px-8 py-4 text-xl">
              Cancel
            </button>
          </div>
        </div>

        <form @submit.prevent="saveRecipeEdit">
          <div class="mb-8">
            <label class="block text-xl font-bold text-gray-800 mb-2">Title</label>
            <input v-model="editForm.title" class="auth-input text-xl" required />
          </div>

          <div class="mb-8">
            <label class="block text-xl font-bold text-gray-800 mb-2">Ingredients (one per line)</label>
            <textarea v-model="editForm.ingredients" class="auth-input" rows="6"></textarea>
          </div>

          <div class="mb-8">
            <label class="block text-xl font-bold text-gray-800 mb-2">Instructions (one step per line)</label>
            <textarea v-model="editForm.instructions" class="auth-input" rows="8"></textarea>
          </div>

          <div class="mb-8">
            <label class="block text-xl font-bold text-gray-800 mb-2">YouTube link (optional)</label>
            <input v-model="editForm.youtube" class="auth-input text-xl" />
          </div>

          <div class="flex justify-center gap-8">
            <button type="button" @click="editingRecipe = false" class="auth-btn secondary px-10 py-4 text-xl">
              Cancel
            </button>
            <button type="submit" :disabled="savingEdit" class="auth-btn primary px-10 py-4 text-xl">
              {{ savingEdit ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="deleteModal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-3xl">
        <h3 class="text-3xl font-bold text-red-600 mb-4">Delete Recipe?</h3>
        <p class="text-gray-700 mb-8">This action cannot be undone.</p>
        <div class="flex gap-6">
          <button @click="executeDeleteRecipe" :disabled="deleting" class="auth-btn bg-red-600 hover:bg-red-700 flex-1 py-4 text-xl">
            {{ deleting ? 'Deleting...' : 'Delete Forever' }}
          </button>
          <button @click="deleteModal = false" class="auth-btn secondary flex-1 py-4 text-xl">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const router = useRouter()

const recipes = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')

const API_BASE = 'http://localhost:5000/api'
const token = localStorage.getItem('token')
const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(currentUser.role)

const filteredRecipes = computed(() => {
  if (!searchQuery.value.trim()) return recipes.value
  const query = searchQuery.value.toLowerCase()
  return recipes.value.filter(r =>
    r.title.toLowerCase().includes(query) ||
    r.dish.name.toLowerCase().includes(query)
  )
})

const currentDishName = ref('')
const currentRecipeImage = ref('')
const currentDishThumb = ref('')
const cropperVisible = ref(false)
const imageSrc = ref('')
const croppedImageBlob = ref(null)
const currentImagePreview = ref(null)
const fileInput = ref(null)
const cropper = ref(null) 

const triggerFileInput = () => fileInput.value.click()

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageSrc.value = e.target.result
      cropperVisible.value = true
    }
    reader.readAsDataURL(file)
  }
}

const cropImage = () => {
  if (!cropper.value) return

  const result = cropper.value.getResult()
  if (!result?.canvas) return

  result.canvas.toBlob((blob) => {
    croppedImageBlob.value = blob
    currentImagePreview.value = URL.createObjectURL(blob)
  }, 'image/jpeg', 0.95)

  cropperVisible.value = false
}

const cancelCrop = () => {
  cropperVisible.value = false
  imageSrc.value = ''
  croppedImageBlob.value = null
  currentImagePreview.value = null
}

const editingRecipe = ref(false)
const editForm = ref({})
const savingEdit = ref(false)
const editingRecipeId = ref(null)

const startEditRecipe = (recipe) => {
  editingRecipe.value = true
  editingRecipeId.value = recipe.id
  currentDishName.value = recipe.dish.name
  currentRecipeImage.value = recipe.image
  currentDishThumb.value = recipe.dish.thumb_file

  const ingredientsStr = typeof recipe.ingredients === 'string' ? recipe.ingredients : ''

  editForm.value = {
    title: recipe.title,
    ingredients: ingredientsStr,
    instructions: recipe.instructions || '',
    youtube: recipe.youtube || ''
  }

  currentImagePreview.value = null
  croppedImageBlob.value = null
}

const saveRecipeEdit = async () => {
  savingEdit.value = true
  try {
    const formData = new FormData()
    formData.append('title', editForm.value.title)

    const ingredientsArray = editForm.value.ingredients
      .split('\n')
      .map(i => i.trim())
      .filter(i => i.length > 0)
    formData.append('ingredients', JSON.stringify(ingredientsArray))

    formData.append('instructions', editForm.value.instructions)
    formData.append('youtube', editForm.value.youtube || '')

    if (croppedImageBlob.value) {
      formData.append('image', croppedImageBlob.value, 'recipe.jpg')
    }

    await axios.put(`${API_BASE}/recipes/${editingRecipeId.value}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    await fetchRecipes()
    editingRecipe.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to update recipe')
  } finally {
    savingEdit.value = false
  }
}

const deleteModal = ref(false)
const deleting = ref(false)
const recipeToDelete = ref(null)

const confirmDeleteRecipe = (id) => {
  recipeToDelete.value = id
  deleteModal.value = true
}

const executeDeleteRecipe = async () => {
  deleting.value = true
  try {
    await axios.delete(`${API_BASE}/recipes/${recipeToDelete.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    recipes.value = recipes.value.filter(r => r.id !== recipeToDelete.value)
    deleteModal.value = false
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete recipe')
  } finally {
    deleting.value = false
  }
}

const fetchRecipes = async () => {
  loading.value = true
  try {
    const endpoint = isAdmin ? '/recipes' : '/me/recipes'
    const { data } = await axios.get(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    recipes.value = data.map(r => ({
      ...r,
      upvotes: r.upvotes || r.votes?.filter(v => v.type === 'UP').length || 0,
      downvotes: r.downvotes || r.votes?.filter(v => v.type === 'DOWN').length || 0
    }))
  } catch (err) {
    error.value = 'Failed to load recipes'
  } finally {
    loading.value = false
  }
}

onMounted(fetchRecipes)
</script>

<style scoped>
.auth-input {
  @apply w-full px-8 py-5 rounded-2xl border-2 border-gray-300 focus:border-primary focus:outline-none text-xl transition-all;
}
.auth-btn {
  @apply rounded-2xl font-bold transition-all shadow-2xl hover:shadow-3xl;
}
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
.cropper-container {
  @apply relative w-full h-80 bg-gray-100 rounded-2xl overflow-hidden;
}
.cropper { @apply h-full w-full; }
</style>
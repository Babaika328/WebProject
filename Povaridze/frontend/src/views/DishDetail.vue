<template>
  <div class="container dish-detail py-12">
    <div v-if="loading" class="text-center py-32 text-3xl">Loading...</div>
    <div v-else-if="error" class="text-center text-red-600 py-32">{{ error }}</div>
    <div v-else>
      <h1 class="text-5xl md:text-6xl font-bold text-center text-primary mb-10">{{ dish.name }}</h1>
      <div class="flex justify-center gap-8 mb-16 flex-wrap">
        <router-link v-if="dish.category" :to="getFilterLink('category', dish.category)" class="tag-btn category">
          {{ dish.category }}
        </router-link>
        <router-link v-if="dish.area" :to="getFilterLink('area', dish.area)" class="tag-btn area">
          {{ dish.area }}
        </router-link>
      </div>
      <div v-if="dish.youtube" class="youtube-section mb-20">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">Video Tutorial</h3>
        <div class="video-container">
          <iframe :src="youtubeEmbedUrl" class="youtube-video" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>
      <h2 class="text-5xl font-bold text-primary text-center my-20">Recipes</h2>
      <div class="recipes-grid">
        <div class="recipe-card-link" @click="goToDefaultRecipe">
          <div class="recipe-card default-recipe">
            <img
              :src="`http://localhost:5000/images/${dish.thumb_file}`"
              :alt="dish.name"
              class="recipe-thumb"
              @error="handleThumbError"
            />
            <div class="recipe-info">
              <h3 class="recipe-title">{{ dish.name }}</h3>
              <p class="author">by Povaridze</p>
            </div>
          </div>
        </div>

        <div
          v-for="recipe in enrichedRecipes"
          :key="recipe.id"
          class="recipe-card-link relative"
        >
          <router-link :to="`/recipe/${recipe.id}`" class="block">
            <div class="recipe-card">
              <img
                :src="getUserRecipeImage(recipe)"
                :alt="recipe.title"
                class="recipe-thumb"
                @error="handleThumbError"
              />
              <div class="recipe-info">
                <h3 class="recipe-title">{{ recipe.title }}</h3>
                <p class="author">by {{ recipe.user.username }}</p>
                <div class="votes">
                  Up <span class="up-count">{{ recipe.upvotes }}</span>
                  Down <span class="down-count">{{ recipe.downvotes }}</span>
                </div>
              </div>
            </div>
          </router-link>

          <div
            v-if="isRecipeOwner(recipe) || isAdmin"
            class="absolute top-4 right-4 flex gap-3 bg-white rounded-full p-2 shadow-lg z-10"
          >
            <button
              @click.stop="startEditRecipe(recipe)"
              class="text-green-600 hover:text-green-800 transition"
              title="Edit"
            >
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>


            <button
              @click.stop="confirmDeleteRecipe(recipe.id)"
              class="text-red-600 hover:text-red-800 transition"
              title="Delete"
            >
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <router-link
          :to="{ name: 'AddRecipe', params: { dishId: dish.idMeal } }"
          class="recipe-card-link add-recipe-card"
        >
          <div class="recipe-card add-recipe">
            <div class="add-recipe-content">
              <svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
              </svg>
              <p class="add-text">Add Your Recipe</p>
            </div>
          </div>
        </router-link>
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
            <button @click="executeDeleteRecipe" :disabled="deleting" class="auth-btn bg-red-600 hover:bg-red-700 flex-1 py-5 text-xl">
              {{ deleting ? 'Deleting...' : 'Delete Forever' }}
            </button>
            <button @click="deleteModal = false" class="auth-btn secondary flex-1 py-5 text-xl">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const dish = ref(null)
const loading = ref(true)
const error = ref('')

const API_BASE = 'http://localhost:5000/api'
const token = localStorage.getItem('token')
const currentUser = ref(JSON.parse(localStorage.getItem('user') || '{}'))

const isAuthenticated = computed(() => !!token)
const isAdmin = computed(() => ['ADMIN', 'SUPERADMIN'].includes(currentUser.value.role))

const isRecipeOwner = (recipe) => recipe.userId === currentUser.value.id

const handleThumbError = (e) => {
  e.target.src = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious'
}

const youtubeEmbedUrl = computed(() => {
  if (!dish.value?.youtube) return ''
  const match = dish.value.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : ''
})

const getUserRecipeImage = (recipe) => {
  if (recipe.image) return `http://localhost:5000/recipes/${recipe.image}`
  return `http://localhost:5000/images/${dish.value.thumb_file}` || 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious'
}

const getFilterLink = (type, value) => ({ name: 'Home', query: { [type]: value, page: 1 } })

const enrichedRecipes = computed(() => {
  return dish.value.recipes.map(recipe => ({
    ...recipe,
    upvotes: recipe.votes?.filter(v => v.type === 'UP').length || 0,
    downvotes: recipe.votes?.filter(v => v.type === 'DOWN').length || 0
  }))
})

const goToDefaultRecipe = () => {
  router.push(`/recipe/default?dishId=${dish.value.idMeal}`)
}

const editingRecipe = ref(false)
const editForm = ref({})
const savingEdit = ref(false)
const editingRecipeId = ref(null)

const startEditRecipe = (recipe) => {
  editingRecipe.value = true
  editingRecipeId.value = recipe.id
  editForm.value = {
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    youtube: recipe.youtube
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

    await axios.put(`${API_BASE}/recipes/${editingRecipeId.value}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    await fetchDish()
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
    dish.value.recipes = dish.value.recipes.filter(r => r.id !== recipeToDelete.value)
    deleteModal.value = false
    recipeToDelete.value = null
  } catch (err) {
    alert(err.response?.data?.error || 'Failed to delete recipe')
  } finally {
    deleting.value = false
  }
}

const fetchDish = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/dishes/${route.params.idMeal}`)
    dish.value = data
  } catch (err) {
    error.value = 'Dish not found'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDish)
</script>

<style scoped>
.tag-btn {
  @apply inline-block px-10 py-5 rounded-2xl bg-green-600 text-white font-bold text-lg shadow-2xl hover:bg-green-700 hover:scale-110 transition-all duration-300;
}
.youtube-section { @apply my-16; }
.video-container { @apply flex justify-center; }
.youtube-video {
  @apply w-full max-w-3xl h-[600px] rounded-3xl shadow-3xl border-8 border-white;
}
.recipes-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 justify-center my-12;
}
.recipe-card-link {
  @apply block w-full max-w-sm cursor-pointer;
}
.recipe-card {
  @apply bg-white rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-3xl hover:-translate-y-4 h-full flex flex-col;
}
.recipe-card.default-recipe {
  @apply border-4 border-green-600 ring-4 ring-green-300 ring-opacity-50;
}
.recipe-card.default-recipe .recipe-title {
  @apply text-green-700 font-extrabold;
}
.recipe-thumb { @apply w-full h-64 object-cover; }
.recipe-info {
  @apply p-6 text-center flex-grow flex flex-col justify-between;
}
.recipe-title {
  @apply text-xl font-bold text-primary mb-2 line-clamp-2;
}
.author { @apply text-gray-600 font-medium mb-4; }
.votes {
  @apply inline-flex items-center gap-3 bg-gray-100 text-gray-800 px-6 py-3 rounded-full font-bold text-base shadow-lg mx-auto;
}
.add-recipe-card { @apply block w-full max-w-sm; }
.add-recipe {
  @apply bg-gradient-to-br from-green-500 to-green-700 text-white rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 cursor-pointer h-full flex items-center justify-center;
}
.add-recipe-content {
  @apply text-center p-8;
}
.add-icon {
  @apply w-24 h-24 mx-auto mb-6;
}
.add-text {
  @apply text-2xl font-bold;
}
.up-count {
  @apply text-green-600 font-bold;
}
.down-count {
  @apply text-red-600 font-bold;
}
</style>
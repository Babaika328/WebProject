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

        <router-link
          v-for="recipe in enrichedRecipes"
          :key="recipe.id"
          :to="`/recipe/${recipe.id}`"
          class="recipe-card-link"
        >
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
                Down <span class="down-count"> {{ recipe.downvotes }}</span>
              </div>
            </div>
          </div>
        </router-link>

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
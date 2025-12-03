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

      <div v-if="dish.youtube" class="youtube-section">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">Video Tutorial</h3>
        <div class="video-container">
          <iframe :src="youtubeEmbedUrl" class="youtube-video" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>

      <h2 class="text-5xl font-bold text-primary text-center my-20">Recipes</h2>

      <div class="recipes-grid">
        <router-link 
          v-for="recipe in dish.recipes" 
          :key="recipe.id || 'default'" 
          :to="getRecipeLink(recipe)"
          class="recipe-card-link"
        >
          <div class="recipe-card" :class="{ 'default-recipe': !recipe.id }">
            <img :src="recipeImage" :alt="recipe.title" class="recipe-thumb" @error="handleThumbError" />
            <div class="recipe-info">
              <h3 class="recipe-title">{{ recipe.title }}</h3>
              <p class="author">by {{ recipe.user.username }}</p>
              <div class="votes">
                Up {{ recipe._count?.votes || 0 }}
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const dish = ref(null)
const loading = ref(true)
const error = ref('')

const API_BASE = 'http://localhost:5000/api'

const recipeImage = computed(() => 
  dish.value?.thumb_file ? `http://localhost:5000/images/${dish.value.thumb_file}` : 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious'
)

const handleThumbError = (e) => { e.target.src = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious' }

const youtubeEmbedUrl = computed(() => {
  if (!dish.value?.youtube) return ''
  const match = dish.value.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : ''
})

const getRecipeLink = (recipe) => recipe.id ? `/recipe/${recipe.id}` : `/recipe/default?dishId=${dish.value.idMeal}`
const getFilterLink = (type, value) => ({ name: 'Home', query: { [type]: value, page: 1 } })

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
  @apply inline-block px-10 py-5 rounded-2xl bg-green-600 text-white font-bold text-lg shadow-2xl 
         hover:bg-green-700 hover:scale-110 transition-all duration-300;
}
.youtube-section { @apply my-16; }
.video-container { @apply flex justify-center; }
.youtube-video {
  @apply w-full max-w-3xl h-96 rounded-3xl shadow-3xl border-8 border-white;
}
.recipes-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center my-12;
}

.recipe-card-link { @apply block w-full max-w-sm; }

.recipe-card {
  @apply bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-3 cursor-pointer;
}
.recipe-card.default-recipe { @apply border-4 border-green-600; }

.recipe-thumb { @apply w-full h-56 object-cover; }

.recipe-info {
  @apply p-6 text-center;
}
.recipe-title {
  @apply text-xl font-bold text-primary mb-2 line-clamp-2;
}
.author { @apply text-gray-600 font-medium; }
.votes {
  @apply inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg;
}
</style>
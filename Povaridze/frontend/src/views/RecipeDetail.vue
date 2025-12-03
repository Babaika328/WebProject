<template>
  <div class="container recipe-detail py-12">
    <div v-if="loading" class="text-center py-20 text-2xl">Loading...</div>
    <div v-else-if="error" class="text-center text-red-600 py-20">{{ error }}</div>
    <div v-else>
      <h1 class="text-5xl md:text-6xl font-bold text-center text-primary mb-8">
        {{ recipe.title }}
      </h1>

      <div class="flex justify-center gap-6 mb-12 flex-wrap">
        <router-link 
          v-if="recipe.dish.category" 
          :to="getFilterLink('category', recipe.dish.category)" 
          class="tag-btn category"
        >
          {{ recipe.dish.category }}
        </router-link>
        <router-link 
          v-if="recipe.dish.area" 
          :to="getFilterLink('area', recipe.dish.area)" 
          class="tag-btn area"
        >
          {{ recipe.dish.area }}
        </router-link>
      </div>

      <div class="image-wrapper">
        <img 
          :src="recipeImage" 
          :alt="recipe.title" 
          class="recipe-image" 
          @error="handleImageError" 
        />
      </div>

      <p class="text-center text-xl text-gray-700 mt-6">
        <strong>Author:</strong> {{ recipe.user.username }}
      </p>

      <div class="votes flex justify-center gap-8 my-10">
        <button @click="vote('UP')" class="vote-btn up" :disabled="!canInteract">
          Up {{ recipe._count?.votes || 0 }}
        </button>
        <button @click="vote('DOWN')" class="vote-btn down" :disabled="!canInteract">
          Down
        </button>
      </div>

      <div class="ingredients-section">
        <h3 class="section-title">Ingredients</h3>
        <ul class="list">
          <li v-for="(ing, i) in parsedIngredients" :key="i">{{ ing }}</li>
        </ul>
      </div>

      <div class="instructions-section">
        <h3 class="section-title">Instructions</h3>
        <ol class="list">
          <li v-for="(step, i) in parsedInstructions" :key="i">{{ step }}</li>
        </ol>
      </div>

      <div class="comments-section">
        <h3 class="section-title">Comments ({{ recipe._count?.comments || 0 }})</h3>
        <div v-for="comment in recipe.comments || []" :key="comment.id" class="comment">
          <strong>{{ comment.user.username }}:</strong> {{ comment.text }}
        </div>
        <textarea v-if="canInteract" v-model="newComment" placeholder="Add a comment..." class="comment-input"></textarea>
        <button v-if="canInteract" @click="addComment" class="submit-btn">Post Comment</button>
      </div>

      <button class="back-button" @click="$router.push(`/dish/${recipe.dish.idMeal}`)">
        Back to Dish
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const recipe = ref(null)
const newComment = ref('')
const loading = ref(true)
const error = ref('')
const isDefault = route.params.id === 'default'
const canInteract = !isDefault

const API_BASE = 'http://localhost:5000/api'

const recipeImage = computed(() => {
  const thumb = recipe.value?.dish?.thumb_file
  return thumb ? `http://localhost:5000/images/${thumb}` : 'https://via.placeholder.com/800x600/e74c3c/ffffff?text=Delicious'
})

const handleImageError = (e) => {
  e.target.src = 'https://via.placeholder.com/800x600/e74c3c/ffffff?text=Delicious'
}

const parsedIngredients = computed(() => {
  return (recipe.value?.ingredients || '').split(',').map(i => i.trim()).filter(Boolean)
})

const parsedInstructions = computed(() => {
  const text = recipe.value?.instructions || ''
  return text
    .split(/\n\s*▢\s*\n|\n\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(step => step.replace(/^STEP\s*\d+[:.]?\s*/i, '').trim())
    .filter(Boolean)
})

const getFilterLink = (type, value) => ({ name: 'Home', query: { [type]: value, page: 1 } })

const vote = async (type) => {
  try {
    await axios.post(`${API_BASE}/votes`, { recipeId: recipe.value.id, type }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    fetchRecipe()
  } catch (err) { console.error(err) }
}

const addComment = async () => {
  if (!newComment.value.trim()) return
  try {
    await axios.post(`${API_BASE}/comments`, { recipeId: recipe.value.id, text: newComment.value }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    newComment.value = ''
    fetchRecipe()
  } catch (err) { console.error(err) }
}

const fetchRecipe = async () => {
  loading.value = true
  try {
    if (isDefault) {
      const { data } = await axios.get(`${API_BASE}/dishes/${route.query.dishId}`)
      const defaultRecipe = data.recipes[0] || { title: `${data.name} (Default)`, user: { username: 'System' }, _count: { votes: 0, comments: 0 } }
      recipe.value = { ...defaultRecipe, id: 'default', dish: data }
    } else {
      const { data } = await axios.get(`${API_BASE}/recipes/${route.params.id}`)
      recipe.value = data
    }
  } catch (err) {
    error.value = 'Recipe not found'
  } finally {
    loading.value = false
  }
}

onMounted(fetchRecipe)
</script>

<style scoped>
.tag-btn {
  @apply inline-block px-10 py-5 rounded-2xl bg-green-600 text-white font-bold text-lg shadow-2xl 
         hover:bg-green-700 hover:scale-110 transition-all duration-300;
}

.image-wrapper { @apply text-center my-8; }
.recipe-image {
  @apply max-w-xl w-full rounded-3xl shadow-2xl mx-auto my-10;
}

.votes { @apply flex justify-center gap-6 my-8; }
.vote-btn {
  @apply px-8 py-3 rounded-full font-bold text-white text-base shadow-lg hover:scale-105 transition;
}
.up { @apply bg-green-600 hover:bg-green-700; }
.down { @apply bg-red-600 hover:bg-red-700; }

.section-title {
  @apply text-2xl md:text-3xl font-bold text-primary text-center my-10 border-b-4 border-green-600 inline-block pb-2;
}

.list {
  @apply max-w-3xl mx-auto pl-8 text-base md:text-lg leading-8 space-y-3;
}
.list li::marker { @apply text-green-600 font-bold text-xl; }

.comments-section { @apply max-w-3xl mx-auto my-12; }
.comment { @apply bg-gray-50 p-4 rounded-xl mb-4 shadow-sm border-l-4 border-green-600; }
.comment-input { @apply w-full p-4 rounded-xl border border-gray-300 focus:border-green-600 outline-none; }
.submit-btn { @apply bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl mt-3 shadow-lg hover:shadow-xl transition; }

.back-button {
  @apply fixed top-36 right-6 bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-base shadow-2xl hover:scale-110 hover:bg-green-700 transition-all z-50;
}
</style>
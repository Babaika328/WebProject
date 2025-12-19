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

      <div v-if="recipe.youtube" class="mb-20">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">Video Tutorial</h3>
        <div class="flex justify-center">
          <iframe :src="youtubeEmbedUrl" class="w-full max-w-3xl h-96 rounded-3xl shadow-3xl border-8 border-white" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>

      <div class="max-w-3xl mx-auto mb-20">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">Ingredients</h3>
        <ul class="list-disc list-inside text-xl space-y-4 text-gray-800">
          <li v-for="ing in parsedIngredients" :key="ing">{{ ing }}</li>
        </ul>
      </div>

      <div class="max-w-4xl mx-auto mb-32">
        <h3 class="text-4xl font-bold text-primary text-center mb-12">Instructions</h3>
        <ol class="space-y-8 text-xl text-gray-800 leading-relaxed">
          <li v-for="(step, index) in parsedInstructions" :key="index" class="flex">
            <span class="font-bold text-green-600 text-2xl mr-6 flex-shrink-0">{{ index + 1 }}.</span>
            <span>{{ step }}</span>
          </li>
        </ol>
      </div>

      <div v-if="!isDefault" class="max-w-3xl mx-auto mb-20">
        <h3 class="text-4xl font-bold text-primary text-center mb-10">
          Comments ({{ recipe.comments?.length || 0 }})
        </h3>

        <div v-if="recipe.comments?.length" class="space-y-6">
          <div v-for="comment in recipe.comments" :key="comment.id" class="bg-gray-50 p-6 rounded-2xl shadow-lg border-l-4 border-green-600">
            <p class="font-bold text-lg text-primary">{{ comment.user.username }}</p>
            <p class="text-gray-700 mt-2">{{ comment.text }}</p>
          </div>
        </div>
        <p v-else class="text-center text-gray-500 text-xl">No comments yet. Be the first!</p>

        <div v-if="isAuthenticated" class="mt-10">
          <textarea
            v-model="newComment"
            placeholder="Write your comment..."
            rows="4"
            class="w-full p-6 rounded-2xl border-2 border-gray-300 focus:border-primary outline-none text-lg"
          ></textarea>
          <button @click="addComment" :disabled="!newComment.trim() || commenting" class="auth-btn primary mt-4 text-xl py-4 px-10">
            {{ commenting ? 'Posting...' : 'Post Comment' }}
          </button>
        </div>
        <p v-else class="text-center text-gray-600 mt-8">Log in to comment</p>
      </div>

      <button @click="$router.push(`/dish/${recipe.dish.idMeal}`)" class="back-button">
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
const loading = ref(true)
const error = ref('')
const newComment = ref('')
const commenting = ref(false)
const voting = ref(false)

const API_BASE = 'http://localhost:5000/api'

const isAuthenticated = computed(() => !!localStorage.getItem('token'))

const isDefault = computed(() => !!route.query.dishId)

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
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
    await axios.post(`${API_BASE}/recipes/${recipe.value.id}/comments`, { text: newComment.value }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    newComment.value = ''
    await fetchRecipe()
  } catch {
    alert('Comment failed')
  } finally {
    commenting.value = false
  }
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
  @apply fixed top-36 right-6 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-110 transition-all z-50;
}
</style>
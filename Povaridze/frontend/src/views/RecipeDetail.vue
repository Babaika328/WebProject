<template>
  <div class="container recipe-detail">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="no-results">{{ error }}</div>
    <div v-else>
      <h1>{{ recipe.title }}</h1>
      
      
      <div class="image-wrapper">
        <img :src="recipeImage" :alt="recipe.title" class="recipe-image" @error="handleImageError" />
      </div>
      
      <p><strong>Author:</strong> {{ recipe.user.username }}</p>
      <div class="votes">
        <button @click="vote('UP')" class="vote-up" :disabled="!canInteract">↑ {{ recipe._count?.votes || 0 }}</button>
        <button @click="vote('DOWN')" class="vote-down" :disabled="!canInteract">↓</button>
      </div>
      
      
      <div class="recipe-meta">
        <router-link 
          v-if="recipe.dish.category" 
          :to="getFilterLink('category', recipe.dish.category)" 
          class="meta-badge category"
        >
          <strong>Category:</strong> {{ recipe.dish.category }}
        </router-link>
        <router-link 
          v-if="recipe.dish.area" 
          :to="getFilterLink('area', recipe.dish.area)" 
          class="meta-badge area"
        >
          <strong>Area:</strong> {{ recipe.dish.area }}
        </router-link>
      </div>
      
      
      <div class="ingredients-section">
        <h3>Ingredients</h3>
        <ul>
          <li v-for="(ing, i) in parsedIngredients" :key="i">{{ ing }}</li>
        </ul>
      </div>
      
      
      <div class="instructions-section">
        <h3>Instructions</h3>
        <ol>
          <li v-for="(step, i) in parsedInstructions" :key="i">{{ step }}</li>
        </ol>
      </div>
      
      <div class="comments">
        <h3>Comments ({{ recipe._count?.comments || 0 }})</h3>
        <div v-for="comment in recipe.comments || []" :key="comment.id" class="comment">
          <strong>{{ comment.user.username }}:</strong> {{ comment.text }}
        </div>
        <textarea v-if="canInteract" placeholder="Add comment..." v-model="newComment"></textarea>
        <button v-if="canInteract" @click="addComment">Post Comment</button>
      </div>
      <router-link :to="`/dish/${recipe.dish.idMeal}`">Back to Dish</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
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
  return thumb ? `${API_BASE.replace('/api', '')}/images/${thumb}` : placeholderImg
})
const placeholderImg = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=🍲'

const handleImageError = (e) => { e.target.src = placeholderImg }


const parsedIngredients = computed(() => {
  const text = recipe.value?.ingredients || ''
  return text.split(/,|\n/).map(ing => ing.trim()).filter(Boolean)
})


const parsedInstructions = computed(() => {
  const text = recipe.value?.instructions || ''
  return text
    .split(/(?<=[\.\!\?])\s+|\n+/)
    .map(step => step.trim().replace(/^\d+\.\d+\.\s*|\^\d+\.\s*/, ''))  
    .filter(Boolean)
})


const getFilterLink = (type, value) => {
  return { name: 'Home', query: { [type]: value, page: 1 } }  
}

const vote = async (type) => {
  if (!canInteract) return
  try {
    await axios.post(`${API_BASE}/votes`, { recipeId: route.params.id, type }, { 
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } 
    })
    fetchRecipe()
  } catch (err) {
    console.error('Vote error:', err)
  }
}

const addComment = async () => {
  if (!newComment.value.trim() || !canInteract) return
  try {
    await axios.post(`${API_BASE}/comments`, { recipeId: route.params.id, text: newComment.value }, { 
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } 
    })
    newComment.value = ''
    fetchRecipe()
  } catch (err) {
    console.error('Comment error:', err)
  }
}

const fetchRecipe = async () => {
  try {
    let data
    if (isDefault) {
      const dishId = route.query.dishId
      if (!dishId) throw new Error('Missing dish ID for default recipe')
      data = await axios.get(`${API_BASE}/dishes/${dishId}`)
      const dishData = data.data
      const defaultRecipe = dishData.recipes[0] || {
        title: `${dishData.name.trim()} (Default)`,
        instructions: dishData.instructions || 'No instructions available.',
        ingredients: dishData.ingredients || 'No ingredients available.',
        user: { username: 'System' },
        _count: { votes: 0, comments: 0 },
        comments: []
      }
      recipe.value = {
        ...defaultRecipe,
        id: 'default',
        dish: dishData
      }
    } else {
      data = await axios.get(`${API_BASE}/recipes/${route.params.id}`)
      recipe.value = data.data
    }
  } catch (err) {
    error.value = 'Recipe not found'
  } finally {
    loading.value = false
  }
}

onMounted(fetchRecipe)
</script>

<style scoped lang="scss">
@use '../assets/scss/_variables' as *;

$primary: #e74c3c; 
$secondary: #27ae60; 
$light-green: #d4edda; 
$white: #ffffff;

.image-wrapper {
  text-align: center;
  margin: $spacing-lg 0;
}

.recipe-image {
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: $card-radius;
  display: block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.votes { 
  display: flex; 
  gap: 1rem; 
  margin: 1rem 0; 
}
.vote-up { 
  background: $secondary; 
  color: $white; 
  padding: 0.5rem 1rem; 
  border-radius: 4px; 
  cursor: pointer; 
  border: none; 
  transition: transform 0.3s ease;
}

.vote-up:hover { 
  transform: scale(1.1);  
}

.vote-down { 
  background: $primary; 
  color: $white; 
  padding: 0.5rem 1rem; 
  border-radius: 4px; 
  cursor: pointer; 
  border: none; 
  transition: transform 0.3s ease;
}

.vote-down:hover { 
  transform: scale(1.1);  
}

.recipe-meta {
  display: flex;
  justify-content: center;
  gap: $spacing-lg;
  margin: $spacing-lg 0;
  
  .meta-badge {
    background: $secondary; 
    color: $white;
    padding: $spacing-md $spacing-lg;
    border-radius: 4px; 
    text-align: center;
    font-size: 1rem; 
    font-weight: bold;
    text-decoration: none;
    transition: transform 0.3s ease, opacity 0.3s ease;

    &:hover {
      transform: scale(1.1); 
      opacity: 0.9;
    }

    strong { 
      display: block; 
      font-size: 0.9rem; 
      margin-bottom: 0.25rem; 
    }

    &.category, &.area {
      border: none;
    }
  }
}

.ingredients-section, .instructions-section {
  margin: $spacing-xl 0;
  h3 { 
    color: $primary; 
    border-bottom: 2px solid $secondary; 
    padding-bottom: $spacing-sm; 
  }
  ul, ol {
    padding-left: $spacing-lg;
    li { 
      margin-bottom: $spacing-sm; 
      line-height: 1.6; 
      color: #333;
    }
  }
  ol { counter-reset: step-counter; }
  ol li { counter-increment: step-counter; }
  ol li:before { 
    content: counter(step-counter) "."; 
    color: $secondary; 
    font-weight: bold; 
    margin-right: $spacing-sm; 
  }
}

.comments textarea { 
  width: 100%; 
  height: 100px; 
  margin-bottom: 0.5rem; 
  padding: 0.5rem; 
  border: 1px solid #e0e0e0; 
  border-radius: 4px; 
}
button { 
  background: $secondary; 
  color: $white; 
  padding: 0.5rem 1rem; 
  border: none; 
  border-radius: 4px; 
  cursor: pointer; 
  transition: transform 0.3s ease;
}

button:hover {
  transform: scale(1.1);  
}

button:disabled { 
  opacity: 0.5; 
  cursor: not-allowed; 
}

.comment { 
  background: #f9f9f9; 
  padding: 0.5rem; 
  margin: 0.5rem 0; 
  border-radius: 4px; 
}
</style>
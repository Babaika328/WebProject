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
        <button @click="vote('UP')" class="vote-up" :disabled="!canInteract">
          Up {{ recipe._count?.votes || 0 }}
        </button>
        <button @click="vote('DOWN')" class="vote-down" :disabled="!canInteract">Down</button>
      </div>

      <div class="recipe-meta">
        <router-link v-if="recipe.dish.category" :to="getFilterLink('category', recipe.dish.category)" class="meta-badge">
          <strong>Category:</strong> {{ recipe.dish.category }}
        </router-link>
        <router-link v-if="recipe.dish.area" :to="getFilterLink('area', recipe.dish.area)" class="meta-badge">
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
        <textarea v-if="canInteract" v-model="newComment" placeholder="Write a comment..."></textarea>
        <button v-if="canInteract" @click="addComment">Post Comment</button>
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
  return thumb ? `http://localhost:5000/images/${thumb}` : 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious'
})

const handleImageError = (e) => {
  e.target.src = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=Delicious'
}

const parsedIngredients = computed(() => {
  return (recipe.value?.ingredients || '')
    .split(',')
    .map(i => i.trim())
    .filter(Boolean)
})

const parsedInstructions = computed(() => {
  const text = recipe.value?.instructions || ''

  let cleaned = text.replace(/▢/g, '|||SPLIT|||')

  const parts = cleaned.split(/\n\s*\n|\n{3,}|(?=STEP\s+\d+)|(?=step\s+\d+)/i)

  return parts
    .map(s => s.trim())
    .filter(Boolean)
    .map(step => {
      return step
        .replace(/^STEP\s*\d+\s*/i, '')
        .replace(/^step\s*\d+\s*/i, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^\d+\)\s*/, '')
        .replace(/^[:\-–—]\s*/, '')
        .trim()
    })
    .filter(Boolean)
})

const getFilterLink = (type, value) => ({ name: 'Home', query: { [type]: value, page: 1 } })

const vote = async (type) => {
  try {
    await axios.post(`${API_BASE}/votes`, { recipeId: recipe.value.id, type }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    fetchRecipe()
  } catch (err) { console.error('Vote error:', err) }
}

const addComment = async () => {
  if (!newComment.value.trim()) return
  try {
    await axios.post(`${API_BASE}/comments`, { recipeId: recipe.value.id, text: newComment.value }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    newComment.value = ''
    fetchRecipe()
  } catch (err) { console.error('Comment error:', err) }
}

const fetchRecipe = async () => {
  loading.value = true
  try {
    if (isDefault) {
      const { data } = await axios.get(`${API_BASE}/dishes/${route.query.dishId}`)
      const defaultRecipe = data.recipes[0] || {
        title: `${data.name} (Default)`,
        instructions: data.instructions || '',
        ingredients: data.ingredients || '',
        user: { username: 'System' },
        _count: { votes: 0, comments: 0 },
        comments: []
      }
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

<style scoped lang="scss">
@use 'sass:color';
@use '../assets/scss/_variables' as *;

.image-wrapper {
  text-align: center;
  margin: $spacing-xl 0;
}

.recipe-image {
  max-width: 600px;
  width: 100%;
  border-radius: $card-radius;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.votes {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin: 2rem 0;
}

.vote-up, .vote-down {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.vote-up { background: #27ae60; color: white; }
.vote-down { background: #e74c3c; color: white; }
.vote-up:hover { background: #219653; transform: translateY(-3px); }
.vote-down:hover { background: #c0392b; transform: translateY(-3px); }

.recipe-meta {
  display: flex;
  justify-content: center;
  gap: $spacing-xl;
  margin: $spacing-xl 0;
}

.meta-badge {
  background: #27ae60;
  color: white;
  padding: $spacing-md $spacing-xl;
  border-radius: 12px;
  text-align: center;
  font-weight: bold;
  text-decoration: none;
  min-width: 160px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(39,174,96,0.3);
}

.meta-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 10px 25px rgba(39,174,96,0.4);
}

.meta-badge strong {
  display: block;
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: 0.3rem;
}

.ingredients-section, .instructions-section {
  margin: $spacing-xl 0;

  h3 {
    color: $primary;
    border-bottom: 4px solid #27ae60;
    padding-bottom: 0.5rem;
    display: inline-block;
    font-size: 1.9rem;
    margin-bottom: $spacing-lg;
  }

  ul {
    padding-left: 2rem;
    li {
      margin: 1rem 0;
      font-size: 1.1rem;
      line-height: 1.7;
    }
  }

  ol {
    padding-left: 2.5rem;
    margin: 0;
  }

  ol li {
    margin: 1.6rem 0;
    padding-left: 0.5rem;
    line-height: 1.85;
    font-size: 1.12rem;
    color: #2c3e50;
  }

  ol li::marker {
    color: #27ae60;
    font-weight: bold;
    font-size: 1.4em;
  }
}

.comments {
  margin-top: $spacing-xl;

  textarea {
    width: 100%;
    height: 120px;
    padding: 1rem;
    border: 2px solid #ddd;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-family: inherit;
  }

  button {
    background: #27ae60;
    color: white;
    padding: 0.7rem 1.5rem;
    border: none;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
  }
}

.comment {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border-left: 5px solid #27ae60;
}

.back-button {
  position: fixed;
  top: 110px;
  right: 20px;
  background: #27ae60;
  color: white;
  padding: $spacing-md $spacing-xl;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 6px 20px rgba(39,174,96,0.4);
  transition: all 0.3s ease;
}

.back-button:hover {
  transform: scale(1.1);
  background: #219653;
  box-shadow: 0 12px 30px rgba(39,174,96,0.5);
}
</style>
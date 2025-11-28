<template>
  <div class="container dish-detail">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="no-results">{{ error }}</div>
    <div v-else>
      <div class="header">
        <h1>{{ dish.name }}</h1>
        
        <div class="dish-meta">
          <router-link 
            v-if="dish.category" 
            :to="getFilterLink('category', dish.category)" 
            class="meta-badge category"
          >
            <strong>Category:</strong> {{ dish.category }}
          </router-link>
          <router-link 
            v-if="dish.area" 
            :to="getFilterLink('area', dish.area)" 
            class="meta-badge area"
          >
            <strong>Area:</strong> {{ dish.area }}
          </router-link>
        </div>
        
        <div v-if="dish.youtube" class="youtube-section">
          <h3>Video Tutorial</h3>
          <iframe 
            width="560" height="315" 
            :src="youtubeEmbedUrl" 
            title="YouTube video player" 
            frameborder="0" 
            allowfullscreen>
          </iframe>
        </div>
      </div>

      <h2>Recipes</h2>
      <div class="recipes-grid">
        
        <router-link 
          v-for="recipe in dish.recipes" 
          :key="recipe.id || 'default'" 
          :to="getRecipeLink(recipe)"
          class="recipe-card-link"
        >
          <div class="recipe-card" :class="{ default: !recipe.id, truncated: !!recipe.id }">
            <img :src="recipeImage" :alt="recipe.title" class="recipe-thumb" @error="handleThumbError" />
            <div class="recipe-content">
              <h3>{{ recipe.title }}</h3>
              <p><strong>Author:</strong> {{ recipe.user.username }}</p>
              <div class="votes">
                <button 
                  @click.stop="recipe.id ? vote(recipe.id, 'UP') : null" 
                  class="vote-up" 
                  :disabled="!recipe.id"
                >↑</button>
                <span class="vote-count">{{ recipe._count.votes || 0 }}</span>
                <button 
                  @click.stop="recipe.id ? vote(recipe.id, 'DOWN') : null" 
                  class="vote-down" 
                  :disabled="!recipe.id"
                >↓</button>
              </div>
              <p><strong>Ingredients Preview:</strong> {{ truncateText(recipe.ingredients) }}</p>
              <p><strong>Instructions Preview:</strong> {{ truncateText(recipe.instructions) }}</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const dish = ref(null)
const loading = ref(true)
const error = ref('')

const API_BASE = 'http://localhost:5000/api'

const recipeImage = computed(() => dish.value?.thumb_file ? `${API_BASE.replace('/api', '')}/images/${dish.value.thumb_file}` : placeholderImg)
const placeholderImg = 'https://via.placeholder.com/200x150/e74c3c/ffffff?text=🍲'

const handleThumbError = (e) => { e.target.src = placeholderImg }

const youtubeEmbedUrl = computed(() => {
  if (dish.value?.youtube) {
    const videoIdMatch = dish.value.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`
    }
  }
  return ''
})

const truncateText = (text) => text ? text.substring(0, 100) + '...' : 'No data'

const getRecipeLink = (recipe) => {
  if (!recipe.id) {
    return `/recipe/default?dishId=${dish.value.idMeal}`
  }
  return `/recipe/${recipe.id}`
}

const getFilterLink = (type, value) => {
  return { name: 'Home', query: { [type]: value, page: 1 } }
}

const vote = async (recipeId, type) => {
  try {
    await axios.post(`${API_BASE}/votes`, { recipeId, type }, { 
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } 
    })
    fetchDish()
  } catch (err) {
    console.error('Vote error:', err)
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

<style lang="scss" scoped>
@use '../assets/scss/_variables' as *;

$primary: #e74c3c;  
$secondary: #27ae60;  
$accent-green: #2ecc71;  
$white: #ffffff;
$shadow: rgba(231, 76, 60, 0.2);  

.dish-meta {
  display: flex;
  justify-content: center;
  gap: $spacing-xl;
  margin: $spacing-xl 0;
  
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

.recipe-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.recipe-card {
  background: $white;
  border-radius: $card-radius;
  box-shadow: $card-shadow;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  gap: $spacing-sm;
  overflow: hidden;

  &.truncated .recipe-content p { 
    font-size: 0.9em;
    color: #666;
  }

  &.default {
    border: 2px solid $secondary;  
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px $shadow; 
  }

  .recipe-thumb {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: calc(#{$card-radius} / 2);
  }

  .recipe-content {
    flex: 1;
    padding: $spacing-md;
    h3 { 
      color: $primary; 
      margin: 0 0 $spacing-xs;
    }
    .votes { 
      display: flex; 
      align-items: center; 
      gap: $spacing-sm; 
      margin: $spacing-sm 0; 
    }
    .vote-up, .vote-down {
      border: none;
      padding: 0.5rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2em;
      color: $white;
      transition: transform 0.3s ease;
    }
    .vote-up {
      background: $secondary; 
    }
    .vote-down {
      background: $primary; 
    }
    .vote-up:hover, .vote-down:hover {
      transform: scale(1.2); 
    }
    .vote-count { font-weight: bold; color: $primary; }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #bdc3c7 !important;  
    }
  }
}

.youtube-section { 
  margin: $spacing-xl 0; 
  text-align: center; 
}
.youtube-section iframe { 
  border-radius: $card-radius; 
  max-width: 100%; 
  height: auto; 
}
</style>
<template>
  <div class="container dish-detail">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="no-results">{{ error }}</div>
    <div v-else>
      <div class="header">
        <h1>{{ dish.name }}</h1>
        <img :src="dishImage" :alt="dish.name" class="image" @error="handleImageError" />
        <p><strong>Category:</strong> {{ dish.category }}</p>
        <p><strong>Area:</strong> {{ dish.area }}</p>
        <p><strong>Ingredients:</strong> {{ dish.ingredients }}</p>
        <p><strong>Instructions:</strong> {{ dish.instructions }}</p>
        
        <!-- New: YouTube Embed -->
        <div v-if="dish.youtube" class="youtube-section">
          <h3>Video Tutorial</h3>
          <iframe 
            width="560" 
            height="315" 
            :src="youtubeEmbedUrl" 
            title="YouTube video player" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      </div>

      <h2>Recipes</h2>
      <div class="recipes-grid">
        <div v-for="recipe in dish.recipes" :key="recipe.id || 'default'" class="recipe-card">
          <h3>{{ recipe.title }}</h3>
          <p><strong>Author:</strong> {{ recipe.user.username }}</p>
          <div class="votes">
            <button @click="vote(recipe.id, 'UP')">👍 {{ recipe._count.votes || 0 }}</button>
            <button @click="vote(recipe.id, 'DOWN')">👎</button>
          </div>
          <p><strong>Instructions:</strong> {{ recipe.instructions }}</p>
          <p><strong>Ingredients:</strong> {{ recipe.ingredients }}</p>
          <div class="comments">
            <h4>Comments ({{ recipe._count.comments || 0 }})</h4>
            <div v-for="comment in recipe.comments || []" :key="comment.id" class="comment">
              <strong>{{ comment.user.username }}:</strong> {{ comment.text }}
            </div>
          </div>
        </div>
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

const dishImage = ref('')
const placeholderImg = 'https://via.placeholder.com/600x400/e74c3c/ffffff?text=🍲'

const handleImageError = (e) => { e.target.src = placeholderImg }

// New: Computed for YouTube Embed URL
const youtubeEmbedUrl = computed(() => {
  if (dish.value?.youtube) {
    // Extract video ID from URL (e.g., "v=4aZr5hZXP_s" or "youtu.be/ID")
    const videoIdMatch = dish.value.youtube.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`
    }
  }
  return ''
})

const vote = async (recipeId, type) => {
  try {
    // Note: Add auth token from localStorage when implementing login
    await axios.post(`${API_BASE}/votes`, { recipeId, type }, { 
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } 
    })
    fetchDish()  // Reload
  } catch (err) {
    console.error('Vote error:', err)
  }
}

const fetchDish = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/dishes/${route.params.idMeal}`)
    dish.value = data
    dishImage.value = data.thumb_file ? `${API_BASE.replace('/api', '')}/images/${data.thumb_file}` : placeholderImg
  } catch (err) {
    error.value = 'Dish not found'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDish)
</script>
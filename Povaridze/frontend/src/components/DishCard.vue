<template>
  <div class="dish-card" @click="$emit('click', dish.idMeal)">
    <img :src="imageUrl" :alt="dish.name" @error="handleImageError" />
    <div class="dish-info">
      <h3>{{ dish.name }}</h3>
      <p class="category">Category: {{ dish.category || 'N/A' }}</p>
      <p class="area">Area: {{ dish.area || 'N/A' }}</p>
      <p>{{ truncateText(dish.ingredients || 'No data') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  dish: Object  
})

defineEmits(['click'])

const { dish } = props  

const API_BASE = 'http://localhost:5000'

const imageUrl = computed(() => {
  return props.dish?.thumb_file ? `${API_BASE}/images/${props.dish.thumb_file}` : placeholderImg.value
})

const placeholderImg = ref('https://via.placeholder.com/280x200/e74c3c/ffffff?text=🍲')

const handleImageError = (e) => { e.target.src = placeholderImg.value }

const truncateText = (text) => text ? text.substring(0, 80) + '...' : 'No data'
</script>
<template>
  <div class="dish-card" @click="$emit('click', dish.idMeal)">
    <img :src="imageUrl" :alt="dish.name" @error="handleImageError" />
    <div class="dish-info">
      <h3>{{ dish.name }}</h3>
      
      <div class="dish-meta" v-if="dish.category || dish.area">
        <p class="category" v-if="dish.category">
          <strong>Category:</strong> <span class="value">{{ dish.category }}</span>
        </p>
        <p class="area" v-if="dish.area">
          <strong>Area:</strong> <span class="value">{{ dish.area }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  dish: Object
})

defineEmits(['click'])

const API_BASE = 'http://localhost:5000'

const imageUrl = computed(() => {
  return props.dish?.thumb_file
    ? `${API_BASE}/images/${props.dish.thumb_file}`
    : 'https://via.placeholder.com/280x200/e74c3c/ffffff?text=Delicious'
})

const handleImageError = (e) => {
  e.target.src = 'https://via.placeholder.com/280x200/e74c3c/ffffff?text=Delicious'
}
</script>

<style scoped>
.dish-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.dish-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.18);
}

.dish-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.dish-info {
  padding: 1.2rem;
  text-align: center;
}

.dish-info h3 {
  margin: 0 0 0.8rem 0;
  color: #e74c3c;
  font-size: 1.35rem;
  font-weight: 700;
}

.dish-meta {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.category,
.area {
  margin: 0;
  font-size: 1.12rem;
  font-weight: 600;
}

.category strong,
.area strong {
  color: #2c3e50;
  font-weight: 700;
}

/* THIS MAKES "Lamb", "Turkish", "Dessert" etc. YELLOW */
.value {
  color: #f39c12;
  font-weight: 700;
}
</style>
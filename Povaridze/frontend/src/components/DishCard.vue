<template>
  <div 
    @click="$emit('click', dish.idMeal)"
    class="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-400 cursor-pointer hover:-translate-y-4 w-full max-w-sm"
  >
    <img 
      :src="imageUrl" 
      :alt="dish.name" 
      class="w-full h-64 object-cover" 
      @error="handleImageError" 
    />
    
    <div class="p-8 text-center">
      <h3 class="text-2xl font-bold text-primary mb-6 leading-tight">
        {{ dish.name }}
      </h3>

      <div class="space-y-3" v-if="dish.category || dish.area">
        <p v-if="dish.category" class="text-lg">
          <strong class="text-gray-700">Category:</strong>
          <span class="text-secondary font-bold ml-2">{{ dish.category }}</span>
        </p>
        <p v-if="dish.area" class="text-lg">
          <strong class="text-gray-700">Area:</strong>
          <span class="text-secondary font-bold ml-2">{{ dish.area }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ dish: Object })
defineEmits(['click'])

const imageUrl = computed(() => 
  props.dish?.thumb_file 
    ? `http://localhost:5000/images/${props.dish.thumb_file}`
    : 'https://via.placeholder.com/300x224/e74c3c/ffffff?text=Delicious'
)

const handleImageError = (e) => {
  e.target.src = 'https://via.placeholder.com/300x224/e74c3c/ffffff?text=Delicious'
}
</script>
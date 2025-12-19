<template>
  <div class="filters-container">
    <div class="filters">
      <input 
        v-model="localSearch" 
        type="text" 
        placeholder="Search dishes..." 
        class="search-input" 
        @input="debouncedUpdate"
      />
      
      <select v-model="localCategory" @change="handleChange" class="select">
        <option value="">All Categories</option>
        <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>

      <select v-model="localArea" @change="handleChange" class="select">
        <option value="">All Countries</option>
        <option v-for="area in uniqueAreas" :key="area" :value="area">{{ area }}</option>
      </select>

      <select v-model="localSort" @change="handleChange" class="select">
        <option value="name_asc">Name A-Z</option>
        <option value="popular">Most Popular</option>
      </select>

      <button @click="clearAll" class="clear-btn">Clear All</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  allDishes: {
    type: Array,
    required: true
  },
  filters: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update'])

const localSearch = ref(props.filters.search || '')
const localCategory = ref(props.filters.category || '')
const localArea = ref(props.filters.area || '')
const localSort = ref(props.filters.sortBy || 'name_asc')

const uniqueCategories = computed(() => {
  const cats = props.allDishes.map(d => d.category).filter(Boolean)
  return [...new Set(cats)].sort()
})

const uniqueAreas = computed(() => {
  const areas = props.allDishes.map(d => d.area).filter(Boolean)
  return [...new Set(areas)].sort()
})

let debounceTimer = null
const debouncedUpdate = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateFilters()
  }, 300)
}

const handleChange = () => {
  updateFilters()
}

const updateFilters = () => {
  emit('update', {
    search: localSearch.value.trim(),
    category: localCategory.value,
    area: localArea.value,
    sortBy: localSort.value
  })
}

const clearAll = () => {
  localSearch.value = ''
  localCategory.value = ''
  localArea.value = ''
  localSort.value = 'name_asc'
  updateFilters()
}

watch(() => props.filters, (newFilters) => {
  localSearch.value = newFilters.search || ''
  localCategory.value = newFilters.category || ''
  localArea.value = newFilters.area || ''
  localSort.value = newFilters.sortBy || 'name_asc'
}, { deep: true })

onMounted(() => {
  updateFilters()
})
</script>

<style scoped>
.filters-container {
  @apply py-8 bg-gray-50 border-b border-gray-200;
}

.filters {
  @apply max-w-7xl mx-auto px-6 flex flex-wrap items-center gap-6 justify-center;
}

.search-input {
  @apply w-full max-w-md px-6 py-4 text-lg rounded-2xl border border-gray-300 focus:border-primary focus:outline-none transition shadow-md hover:shadow-lg;
}

.select {
  @apply px-6 py-4 text-lg rounded-2xl border border-gray-300 bg-white focus:border-primary focus:outline-none transition shadow-md hover:shadow-lg min-w-48;
}

.clear-btn {
  @apply bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-4 rounded-2xl transition shadow-md hover:shadow-xl text-lg;
}
</style>
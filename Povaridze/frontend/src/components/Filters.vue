<template>
  <div class="filters-container">
    <div class="filters">
      <input v-model="localSearch" type="text" placeholder="Search dishes..." class="search-input" @input="handleInput" />
      
      <select v-model="localCategory" @change="handleChange" class="select">
        <option value="">All Categories</option>
        <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
      </select>

      <select v-model="localArea" @change="handleChange" class="select">
        <option value="">All Countries</option>
        <option v-for="area in uniqueAreas" :key="area" :value="area">{{ area }}</option>
      </select>

      <select v-model="localSort" @change="handleChange" class="select">
        <option value="name_asc">Name (A-Z)</option>
        <option value="votes_desc">Most Popular</option>
      </select>

      <button @click="clear" class="clear-btn">Clear All</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { debounce } from 'lodash-es'

const props = defineProps({ allDishes: Array, filters: Object })
const emit = defineEmits(['update'])

const localSearch = ref('')
const localCategory = ref('')
const localArea = ref('')
const localSort = ref('name_asc')

const uniqueCategories = computed(() => [...new Set(props.allDishes.map(d => d.category).filter(Boolean))].sort())
const uniqueAreas = computed(() => [...new Set(props.allDishes.map(d => d.area).filter(Boolean))].sort())

const debouncedEmit = debounce(() => emit('update', {
  search: localSearch.value,
  category: localCategory.value,
  area: localArea.value,
  sortBy: localSort.value
}), 300)

const handleInput = () => debouncedEmit()
const handleChange = () => debouncedEmit()

const clear = () => {
  localSearch.value = ''
  localCategory.value = ''
  localArea.value = ''
  localSort.value = 'name_asc'
  debouncedEmit()
}

watch(() => props.filters, (newFilters) => {
  if (newFilters) {
    localSearch.value = newFilters.search || ''
    localCategory.value = newFilters.category || ''
    localArea.value = newFilters.area || ''
    localSort.value = newFilters.sortBy || 'name_asc'
  }
}, { immediate: true })
</script>

<style scoped>
.filters-container {
  @apply bg-white shadow-lg py-6 my-8 rounded-2xl border border-gray-200;
}

.filters {
  @apply max-w-6xl mx-auto px-4 flex flex-wrap gap-4 justify-center items-center;
}

.search-input {
  @apply w-full max-w-xs px-6 py-3 text-base rounded-xl border border-gray-300 focus:border-primary focus:outline-none transition shadow-sm;
}

.select {
  @apply px-6 py-3 text-base rounded-xl border border-gray-300 bg-white focus:border-primary focus:outline-none transition shadow-sm;
}

.clear-btn {
  @apply bg-primary hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-md hover:shadow-lg;
}
</style>
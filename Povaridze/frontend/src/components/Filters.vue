<template>
  <div class="filters">
    <input v-model="localSearch" type="text" placeholder="Search..." @input="handleInput" />
    <select v-model="localCategory" @change="handleChange">
      <option value="">All Categories</option>
      <option v-for="cat in uniqueCategories" :key="cat" :value="cat">{{ cat }}</option>
    </select>
    <select v-model="localArea" @change="handleChange">
      <option value="">All Areas</option>
      <option v-for="area in uniqueAreas" :key="area" :value="area">{{ area }}</option>
    </select>
    <select v-model="localSort" @change="handleChange">
      <option value="name_asc">By Name (A-Z)</option>
      <option value="votes_desc">By Popularity (Votes ↓)</option>
    </select>
    <button @click="clear">Clear</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { debounce } from 'lodash-es'

const props = defineProps({
  allDishes: Array,
  filters: Object  
})

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
<template>
  <div class="container">
    <h1>All Dishes</h1>
    <Filters :all-dishes="allDishes" :filters="filters" @update="updateFilters" />
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="no-results error">{{ error }}</div>
    <div v-else-if="dishes.length === 0" class="no-results">No results found</div>
    <div v-else class="dish-grid">
      <DishCard v-for="dish in dishes" :key="dish.idMeal" :dish="dish" @click="goToDetail(dish.idMeal)" />
    </div>
    <div v-if="pagination.pages > 1" class="pagination">
      <button @click="prevPage" :disabled="page === 1">Prev</button>
      <button 
        v-for="p in getPageNumbers()" 
        :key="p" 
        @click="goToPage(p)" 
        :class="{ active: page === p, ellipsis: p === '...' }"
      >
        {{ p }}
      </button>
      <button @click="nextPage" :disabled="page === pagination.pages">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import DishCard from '../components/DishCard.vue'
import Filters from '../components/Filters.vue'

const router = useRouter()
const route = useRoute()

const dishes = ref([])
const allDishes = ref([])
const loading = ref(true)
const error = ref('')
const filters = ref({ search: '', category: '', area: '', sortBy: 'name_asc' })
const page = ref(1)
const pagination = ref({ total: 0, pages: 1 })

const API_BASE = 'http://localhost:5000/api'

const fetchDishes = async (filt = {}, p = 1, allForFilters = false) => {
  loading.value = true
  error.value = ''
  try {
    const params = { ...filt, page: p, limit: allForFilters ? 1000 : 12, sortBy: filt.sortBy || 'name_asc' }
    const { data } = await axios.get(`${API_BASE}/dishes`, { params })
    if (allForFilters) allDishes.value = data.dishes
    else {
      dishes.value = data.dishes
      pagination.value = data.pagination
      page.value = p
    }
  } catch (err) {
    console.error('Fetch error:', err)
    error.value = err.response?.data?.error || 'Failed to load dishes'
  } finally {
    loading.value = false
  }
}

const updateFilters = (newFilt) => {
  filters.value = newFilt
  page.value = 1
  fetchDishes(newFilt, 1)
}

const goToDetail = (id) => router.push(`/dish/${id}`)

const goToPage = (p) => {
  if (p >= 1 && p <= pagination.value.pages && p !== '...') {
    fetchDishes(filters.value, p)
  }
}

const prevPage = () => page.value > 1 && fetchDishes(filters.value, page.value - 1)
const nextPage = () => page.value < pagination.value.pages && fetchDishes(filters.value, page.value + 1)


const getPageNumbers = () => {
  const pages = []
  const current = page.value
  const total = pagination.value.pages
  const delta = 5  

  
  pages.push(1)
  if (current > 1 + delta + 1) pages.push('...')

  
  const leftStart = Math.max(2, current - delta)
  for (let p = leftStart; p <= current; p++) {
    pages.push(p)
  }

  
  const rightEnd = Math.min(total - 1, current + delta)
  for (let p = current + 1; p <= rightEnd; p++) {
    pages.push(p)
  }

  if (current < total - delta - 1) pages.push('...')

  
  if (total > rightEnd) pages.push(total)

  return pages
}

watch(() => route.query, (newQuery) => {
  const newFilt = {
    search: newQuery.search || '',
    category: newQuery.category || '',
    area: newQuery.area || '',
    sortBy: newQuery.sortBy || 'name_asc'
  }
  if (JSON.stringify(newFilt) !== JSON.stringify(filters.value)) {
    filters.value = newFilt
    page.value = parseInt(newQuery.page) || 1
    fetchDishes(newFilt, page.value)
  }
}, { immediate: true, deep: true })

onMounted(async () => {
  await fetchDishes({}, 1, true)
  await fetchDishes()
})
</script>

<style scoped>
.error { color: red; }
.pagination button {
  padding: 0.5rem 0.75rem;
  margin: 0 0.25rem;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button.active {
  background: #e74c3c;
  color: white;
}

.pagination button:disabled, .ellipsis {
  opacity: 0.5;
  cursor: default;
  border: none;
  background: transparent;
}
</style>
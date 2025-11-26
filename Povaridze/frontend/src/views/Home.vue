<template>
  <div class="container">
    <h1>Povaridze: All Dishes</h1>
    <Filters :all-dishes="allDishes" :filters="filters" @update="updateFilters" />
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="dishes.length === 0" class="no-results">No results found</div>
    <div v-else class="dish-grid">
      <DishCard v-for="dish in dishes" :key="dish.idMeal" :dish="dish" @click="goToDetail(dish.idMeal)" />
    </div>
    <div v-if="pagination.pages > 1" class="pagination">
      <button @click="prevPage" :disabled="page === 1">Prev</button>
      <span>Page {{ page }} of {{ pagination.pages }} ({{ pagination.total }})</span>
      <button @click="nextPage" :disabled="page === pagination.pages">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import DishCard from '../components/DishCard.vue' 
import Filters from '../components/Filters.vue'

const router = useRouter()

const dishes = ref([])
const allDishes = ref([])  // For filter options
const loading = ref(true)
const filters = ref({ search: '', category: '', area: '', sortBy: 'name_asc' })
const page = ref(1)
const pagination = ref({ total: 0, pages: 1 })

const API_BASE = 'http://localhost:5000/api'

const fetchDishes = async (filt = {}, p = 1, allForFilters = false) => {
  loading.value = true
  try {
    const params = { ...filt, page: p, limit: allForFilters ? 1000 : 12, sortBy: filt.sortBy || 'name_asc' }
    const { data } = await axios.get(`${API_BASE}/dishes`, { params })
    if (allForFilters) allDishes.value = data.dishes
    else {
      dishes.value = data.dishes
      pagination.value = data.pagination
      page.value = p
    }
  } catch (error) {
    console.error('Error:', error)
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

const prevPage = () => page.value > 1 && fetchDishes(filters.value, page.value - 1)
const nextPage = () => page.value < pagination.value.pages && fetchDishes(filters.value, page.value + 1)

onMounted(async () => {
  await fetchDishes({}, 1, true)  // Load all for filters
  await fetchDishes()  // Then first page
})
</script>
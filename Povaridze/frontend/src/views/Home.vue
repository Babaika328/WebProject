<template>
  <div class="container">
    <Filters :all-dishes="allDishes" :filters="filters" @update="updateFilters" />

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="no-results error">{{ error }}</div>
    <div v-else-if="dishes.length === 0" class="no-results">No results found</div>
    <div v-else class="dish-grid">
      <DishCard 
        v-for="dish in sortedDishes" 
        :key="dish.idMeal" 
        :dish="dish" 
        @click="goToDetail(dish.idMeal)" 
      />
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
    const params = {
      ...filt,
      page: p,
      limit: allForFilters ? 1000 : 12,
      sortBy: filt.sortBy || 'name_asc'
    }
    const { data } = await axios.get(`${API_BASE}/dishes`, { params })
    if (allForFilters) allDishes.value = data.dishes
    else {
      dishes.value = data.dishes
      pagination.value = data.pagination
      page.value = p
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to load dishes'
  } finally {
    loading.value = false
  }
}

const updateFilters = (newFilt) => {
  filters.value = newFilt
  page.value = 1
  fetchDishes(newFilt, 1)
  router.push({ query: { ...newFilt, page: 1 } })
}

const goToDetail = (id) => router.push(`/dish/${id}`)

const goToPage = (p) => {
  if (p >= 1 && p <= pagination.value.pages && p !== '...') {
    fetchDishes(filters.value, p)
    router.push({ query: { ...route.query, page: p } })
  }
}

const prevPage = () => {
  if (page.value > 1) {
    const newPage = page.value - 1
    fetchDishes(filters.value, newPage)
    router.push({ query: { ...route.query, page: newPage } })
  }
}

const nextPage = () => {
  if (page.value < pagination.value.pages) {
    const newPage = page.value + 1
    fetchDishes(filters.value, newPage)
    router.push({ query: { ...route.query, page: newPage } })
  }
}

const getPageNumbers = () => {
  const pages = []
  const current = page.value
  const total = pagination.value.pages
  const delta = 3

  pages.push(1)
  if (current > delta + 2) pages.push('...')
  const start = Math.max(2, current - delta)
  const end = Math.min(total - 1, current + delta)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - delta - 1) pages.push('...')
  if (total > 1) pages.push(total)

  return pages
}

const sortedDishes = computed(() => {
  let result = [...dishes.value]

  if (filters.value.sortBy === 'popular') {
    result.sort((a, b) => {
      const getUpVotes = (dish) => 
        dish.recipes.reduce((sum, r) => sum + (r.votes?.filter(v => v.type === 'UP').length || 0), 0)

      return getUpVotes(b) - getUpVotes(a)
    })
  }

  return result
})

watch(
  () => route.query,
  (newQuery) => {
    const newFilt = {
      search: newQuery.search || '',
      category: newQuery.category || '',
      area: newQuery.area || '',
      sortBy: newQuery.sortBy || 'name_asc'
    }
    const newPage = parseInt(newQuery.page) || 1
    if (
      JSON.stringify(newFilt) !== JSON.stringify(filters.value) ||
      newPage !== page.value
    ) {
      filters.value = newFilt
      page.value = newPage
      fetchDishes(newFilt, newPage)
    }
  },
  { immediate: true, deep: true }
)

onMounted(async () => {
  await fetchDishes({}, 1, true) 
  await fetchDishes(filters.value, page.value)
})
</script>

<style scoped>
.dish-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center my-10;
}

.pagination {
  @apply flex justify-center items-center gap-5 my-16 flex-wrap;
}

.pagination button {
  @apply min-w-14 h-12 px-6 rounded-xl font-bold text-lg transition-all shadow-md hover:shadow-xl;
}

.pagination button:not(:disabled):hover {
  @apply bg-primary text-white transform scale-110;
}

.pagination button.active {
  @apply bg-primary text-white shadow-2xl scale-110;
}

.pagination button:disabled {
  @apply bg-gray-200 text-gray-500 cursor-not-allowed opacity-70;
}

.pagination .ellipsis {
  @apply text-gray-600 font-bold text-2xl px-2;
}
</style>
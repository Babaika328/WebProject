import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import DishDetail from '../views/DishDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/dish/:idMeal', name: 'DishDetail', component: DishDetail }
  ]
})

export default router
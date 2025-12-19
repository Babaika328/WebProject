import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import DishDetail from '../views/DishDetail.vue'
import RecipeDetail from '../views/RecipeDetail.vue'
import Login from '../views/auth/Login.vue'
import Signup from '../views/auth/Signup.vue'
import axios from 'axios'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/dish/:idMeal', name: 'DishDetail', component: DishDetail },
    { path: '/recipe/:id', name: 'RecipeDetail', component: RecipeDetail },
    
    { path: '/login', name: 'Login', component: Login },
    { path: '/signup', name: 'Signup', component: Signup },
    
    { path: '/:pathMatch(.*)*', redirect: '/' },
    { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue')},
    { path: '/forgot-password', name: 'ForgotPassword', component: () => import('../views/ForgotPassword.vue')},
    { path: '/admin', name: 'Admin', component: () => import('../views/Admin.vue'), meta: { requiresAdmin: true }},
    { path: '/admin/edit/:id', name: 'AdminEditUser', component: () => import('../views/AdminEditUser.vue'), meta: { requiresAdmin: true }},
    { path: '/add-recipe', name: 'AddRecipe', component: () => import('../views/AddRecipe.vue'), meta: { requiresAuth: true }},
    { path: '/add-recipe/:dishId', name: 'AddRecipe', component: () => import('../views/AddRecipe.vue'), meta: { requiresAuth: true }},
    { path: '/recipe/:id', name: 'RecipeDetail', component: () => import('../views/RecipeDetail.vue')},
  ]
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAdmin && token) {
    try {
      const { data } = await axios.get('http://localhost:5000/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.role !== 'ADMIN' && data.role !== 'SUPERADMIN') {
        next('/')
      } else {
        next()
      }
    } catch {
      next('/login')
    }
  } else {
    next()
  }
})

export default router
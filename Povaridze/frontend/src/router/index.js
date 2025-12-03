import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import DishDetail from '../views/DishDetail.vue'
import RecipeDetail from '../views/RecipeDetail.vue'
import Login from '../views/auth/Login.vue'
import Signup from '../views/auth/Signup.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/dish/:idMeal', name: 'DishDetail', component: DishDetail },
    { path: '/recipe/:id', name: 'RecipeDetail', component: RecipeDetail },
    
    { path: '/login', name: 'Login', component: Login },
    { path: '/signup', name: 'Signup', component: Signup },
    
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})

export default router
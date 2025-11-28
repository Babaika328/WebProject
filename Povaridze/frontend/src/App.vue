<template>
  <div id="app">
    <header class="header">
      <router-link to="/" class="header-link">
        <img src="http://localhost:5000/images/logo.png" alt="Povaridze Logo" class="logo" @error="handleLogoError" />
        <h1 class="header-title">Povaridze</h1>
      </router-link>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const logoError = ref(false)
const handleLogoError = () => { logoError.value = true }
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100px;  
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.header-link {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: inherit;
}

.logo {
  height: 100px;  
  width: auto;
}

.header-title {
  margin: 0;
  color: #e74c3c;
  font-size: 3rem;  
  font-weight: bold;
}

main {
  margin-top: 100px;  
}
</style>
<template>
  <div class="container py-12">
    <h1 class="text-5xl font-bold text-center text-primary mb-8">
      Add Recipe for:
    </h1>
    <h2 class="text-4xl font-bold text-center text-gray-800 mb-12">{{ dishName }}</h2>

    <div class="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10">

      <div v-if="cropperVisible" class="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-8 max-w-4xl w-full">
          <h3 class="text-3xl font-bold text-primary mb-6 text-center">Crop Recipe Image</h3>
          <div class="cropper-container">
            <Cropper
              ref="cropper"
              :src="previewUrl"
              image-restriction="fit-area"
              :min-width="400"
              :min-height="300"
              class="cropper"
            />
          </div>
          <div class="flex gap-6 mt-8">
            <button @click="cropperVisible = false" class="auth-btn secondary flex-1 text-xl py-4">Cancel</button>
            <button @click="applyCrop" class="auth-btn primary flex-1 text-xl py-4">Apply Crop</button>
          </div>
        </div>
      </div>

      <div class="text-center mb-12">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Recipe preview"
          class="w-full max-w-4xl mx-auto rounded-3xl shadow-2xl object-cover h-96"
        />
        <div v-else class="w-full max-w-4xl mx-auto h-96 bg-gray-200 rounded-3xl flex items-center justify-center text-gray-500 text-3xl">
          No image selected
        </div>

        <label class="mt-8 inline-block bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-5 px-12 rounded-2xl cursor-pointer shadow-2xl transition-all hover:scale-105">
          Choose Image
          <input type="file" accept="image/*" @change="onImageSelect" class="hidden" />
        </label>
      </div>

      <div class="mb-12">
        <label class="block text-xl font-bold mb-4">Recipe Title</label>
        <input v-model="form.title" required class="auth-input text-xl" placeholder="My special version..." />
      </div>

      <div class="mb-12">
        <label class="block text-xl font-bold mb-4">Ingredients (one per line)</label>
        <textarea v-model="ingredientsText" rows="10" required class="auth-input text-xl" placeholder="200g chicken&#10;1 onion&#10;salt to taste"></textarea>
      </div>

      <div class="mb-12">
        <label class="block text-xl font-bold mb-4">Instructions</label>
        <textarea v-model="form.instructions" rows="15" required class="auth-input text-xl" placeholder="Step 1: ..."></textarea>
      </div>

      <div class="mb-12">
        <label class="block text-xl font-bold mb-4">YouTube Video URL (optional)</label>
        <input v-model="form.youtube" type="url" class="auth-input text-xl" placeholder="https://www.youtube.com/watch?v=..." />
      </div>

      <button @click="submitRecipe" :disabled="saving" class="auth-btn primary w-full text-2xl py-6">
        {{ saving ? 'Publishing...' : 'Publish Recipe' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const dishId = route.params.dishId
const dishName = ref('Loading...')

const form = ref({
  title: '',
  instructions: '',
  youtube: ''
})
const ingredientsText = ref('')
const imageBlob = ref(null)
const previewUrl = ref('')
const cropperVisible = ref(false)
const cropper = ref(null)

const saving = ref(false)

onMounted(async () => {
  if (!dishId) {
    alert('No dish selected')
    router.push('/')
    return
  }

  try {
    const { data } = await axios.get(`http://localhost:5000/api/dishes/${dishId}`)
    dishName.value = data.name
  } catch {
    alert('Failed to load dish')
    router.push('/')
  }
})

const onImageSelect = (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    previewUrl.value = ev.target.result
    cropperVisible.value = true
  }
  reader.readAsDataURL(file)
}

const applyCrop = () => {
  const { canvas } = cropper.value.getResult()
  if (canvas) {
    canvas.toBlob((blob) => {
      imageBlob.value = blob
      previewUrl.value = URL.createObjectURL(blob)
      cropperVisible.value = false
    }, 'image/jpeg', 0.9)
  }
}

const submitRecipe = async () => {
  saving.value = true

  const formData = new FormData()
  formData.append('dishId', dishId)
  formData.append('title', form.value.title.trim())
  formData.append('instructions', form.value.instructions.trim())
  formData.append('ingredients', JSON.stringify(
    ingredientsText.value.split('\n').map(i => i.trim()).filter(i => i)
  ))

  if (form.value.youtube.trim()) formData.append('youtube', form.value.youtube.trim())
  if (imageBlob.value) formData.append('image', imageBlob.value)

  try {
    await axios.post('http://localhost:5000/api/recipes', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    alert('Recipe published!')
    router.push(`/dish/${dishId}`)
  } catch (err) {
    alert(err.response?.data?.error || 'Error')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cropper-container { height: 500px; background: #000; border-radius: 20px; overflow: hidden; }
.cropper { height: 100%; }
.auth-input { @apply w-full px-8 py-6 rounded-2xl border-2 border-gray-300 focus:border-primary focus:outline-none text-xl transition-all; }
.auth-btn { @apply rounded-2xl font-bold transition-all shadow-2xl hover:shadow-3xl; }
.primary { @apply bg-primary text-white hover:bg-red-700; }
.secondary { @apply bg-gray-200 text-gray-800 hover:bg-gray-300; }
</style>
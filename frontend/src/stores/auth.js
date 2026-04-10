import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const isAutoLogin = ref(localStorage.getItem('isAutoLogin') === 'true')

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username, password) {
    try {
      const response = await axios.post('/api/auth/login', { username, password })
      token.value = response.data.token
      user.value = response.data.user
      isAutoLogin.value = false
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('isAutoLogin', 'false')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      return { success: true }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '登录失败' }
    }
  }

  async function autoLogin() {
    try {
      const response = await axios.post('/api/auth/auto-login')
      token.value = response.data.token
      user.value = response.data.user
      isAutoLogin.value = true
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('isAutoLogin', 'true')
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      return { success: true }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || '自动登录失败' }
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    isAutoLogin.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('isAutoLogin')
    delete axios.defaults.headers.common['Authorization']
  }

  async function fetchUserInfo() {
    try {
      const response = await axios.get('/api/auth/me')
      user.value = response.data
      return true
    } catch (error) {
      logout()
      return false
    }
  }

  return {
    user,
    token,
    isAutoLogin,
    isAuthenticated,
    isAdmin,
    login,
    autoLogin,
    logout,
    fetchUserInfo
  }
})

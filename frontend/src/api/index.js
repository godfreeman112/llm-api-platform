import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API相关接口
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  autoLogin: () => api.post('/auth/auto-login'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data)
}
export const chatApi = {
  sendMessage: (data) => api.post('/chat/send', data),
  getHistory: () => api.get('/chat/history'),
  clearHistory: () => api.delete('/chat/history')
}

// 模型相关接口
export const modelApi = {
  getList: () => api.get('/models'),
  create: (data) => api.post('/models', data),
  update: (id, data) => api.put(`/models/${id}`, data),
  delete: (id) => api.delete(`/models/${id}`),
  test: (id) => api.post(`/models/${id}/test`)
}

// 用户相关接口
export const userApi = {
  getList: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`)
}

// 监控相关接口
export const monitorApi = {
  getStats: (period = '7d') => api.get(`/monitor/stats?period=${period}`),
  getUsageTrend: (period = '7d') => api.get(`/monitor/usage-trend?period=${period}`),
  getModelStats: () => api.get('/monitor/model-stats'),
  getUserStats: () => api.get('/monitor/user-stats')
}

// 图像生成相关接口
export const imageApi = {
  generate: (data) => api.post('/image/generate', data)
}

export default api

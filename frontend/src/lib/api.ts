import axios from 'axios'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  // Try direct 'token' key first (set by setAuth), fallback to zustand persist store
  let token = localStorage.getItem('token')
  if (!token) {
    try {
      const stored = localStorage.getItem('auth-storage')
      if (stored) token = JSON.parse(stored)?.state?.token ?? null
    } catch {}
  }
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

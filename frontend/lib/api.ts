import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
})

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("churnguard_access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      if (typeof window !== "undefined") {
        const refresh = localStorage.getItem("churnguard_refresh_token")
        if (refresh) {
          try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refresh
            })
            const newToken = res.data.access_token
            localStorage.setItem("churnguard_access_token", newToken)
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return api(originalRequest)
          } catch (e) {
            localStorage.removeItem("churnguard_access_token")
            localStorage.removeItem("churnguard_refresh_token")
            window.location.href = "/login"
          }
        } else {
          window.location.href = "/login"
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

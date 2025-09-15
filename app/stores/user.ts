import { defineStore } from 'pinia'
import type { User } from '@prisma/client'

export const useUserStore = defineStore('UserStore', {
  state: (): UserStoreState => ({
    isInitialized: false,
    currentUser: null,
  }),
  actions: {
    async initialize() {
      if (this.isInitialized) return
      const userCookie = useCookie(AuthSettings.cookie.name, AuthSettings.cookie.options)
      if (userCookie.value) {
        try {
          this.currentUser = await $fetch<User>(`/api/auth/me`)
        }
        catch (error) {
          console.error('Error verifying User Cookie:', error)
          this.currentUser = null
        }
        finally {
          this.isInitialized = true
        }
      }
      else {
        this.isInitialized = true
      }
    },
    async loginWithGoogle() {
      const response = await $fetch<{ authUrl: string }>('/api/auth/google/login')
      navigateTo(response.authUrl, { external: true })
    },
    async callbackLoginWithGoogle(code: string, state: string) {
      try {
        this.currentUser = await $fetch<User>('/api/auth/google/callback', {
          method: 'POST',
          body: { code, state },
        })
      }
      catch (error) {
        console.error('Error in callbackLoginWithGoogle:', error)
        this.currentUser = null
        throw error
      }
    },
    logout() {
      this.currentUser = null
      const userCookie = useCookie(AuthSettings.cookie.name, AuthSettings.cookie.options)
      userCookie.value = null
      navigateTo('/auth/login')
    },
  },
  getters: {
    getIsInitialized: state => state.isInitialized,
    getIsLoggedIn: state => state.isInitialized && !!state.currentUser,
    getCurrentUser: state => state.currentUser,
  },
})

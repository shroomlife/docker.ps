import { defineStore } from 'pinia'

export const useUserStore = defineStore('UserStore', {
  state: (): UserStoreState => ({
    isInitialized: false,
    currentUser: null,
  }),
  actions: {
    async initialize() {
      if (this.isInitialized) return

      const appStore = useAppStore()
      appStore.addLoader('userStore/initialize')
      // The session cookie is httpOnly (not readable by JS), so we derive auth
      // state from the server: /api/auth/me sends the cookie automatically and
      // returns 401 when there is no valid session.
      try {
        const loadedUser = await $fetch<AppUser>(`/api/auth/me`)
        this.setCurrentUser(loadedUser)
      }
      catch {
        this.currentUser = null
      }
      this.isInitialized = true
      appStore.removeLoader('userStore/initialize')
    },
    async loginWithGoogle() {
      const response = await $fetch<{ authUrl: string }>('/api/auth/google/login')
      navigateTo(response.authUrl, { external: true })
    },
    async callbackLoginWithGoogle(code: string, state: string) {
      try {
        const loadedUser = await $fetch<AppUser>('/api/auth/google/callback', {
          method: 'POST',
          body: { code, state },
        })
        this.setCurrentUser(loadedUser)
      }
      catch (error) {
        console.error('Error in callbackLoginWithGoogle:', error)
        this.currentUser = null
        throw error
      }
    },
    async logout() {
      // Server clears the httpOnly cookie; the client cannot.
      try {
        await $fetch('/api/auth/logout', { method: 'POST' })
      }
      catch (error) {
        console.error('Error during logout:', error)
      }
      this.currentUser = null
    },
    setCurrentUser(user: AppUser) {
      this.currentUser = user
      const dockerStore = useDockerStore()
      dockerStore.addHosts(user.dockerHosts)
    },
  },
  getters: {
    getIsInitialized: state => state.isInitialized,
    getIsLoggedIn: state => state.isInitialized && !!state.currentUser,
    getCurrentUser: state => state.currentUser,
  },
})

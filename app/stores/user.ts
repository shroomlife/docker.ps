import { defineStore } from 'pinia'

export const useUserStore = defineStore('UserStore', {
  state: (): UserStoreState => ({
    isInitialized: false,
    currentUser: null,
  }),
  actions: {
    hasAuthCookie(): boolean {
      const userCookie = useCookie(AuthSettings.cookie.name, AuthSettings.cookie.options)
      return !!userCookie.value
    },
    async initialize() {
      if (this.isInitialized) return
      const userCookie = useCookie(AuthSettings.cookie.name, AuthSettings.cookie.options)
      if (userCookie.value) {
        try {
          const loadedUser = await $fetch<AppUser>(`/api/auth/me`)
          this.setCurrentUser(loadedUser)
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
    logout() {
      this.currentUser = null
      const userCookie = useCookie(AuthSettings.cookie.name, AuthSettings.cookie.options)
      userCookie.value = null
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

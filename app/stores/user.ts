import { defineStore } from 'pinia'

export const useUserStore = defineStore('UserStore', {
  state: () => ({
    currentUser: null,
  }),
  actions: {
    async loginWithGoogle() {
      const response = await $fetch<{ authUrl: string }>('/api/auth/google/login')
      navigateTo(response.authUrl, { external: true })
    },
  },
  getters: {
    isLoggedIn: state => !!state.currentUser,
  },
})

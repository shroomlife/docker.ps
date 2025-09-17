import { defineStore } from 'pinia'

export const useAppStore = defineStore('AppStore', {
  state: (): AppStoreState => ({
    loaders: [],
  }),
  actions: {
    addLoader(loaderId: string) {
      if (!this.loaders.includes(loaderId)) {
        this.loaders.push(loaderId)
      }
    },
    removeLoader(loaderId: string) {
      this.loaders = this.loaders.filter(id => id !== loaderId)
    },
  },
  getters: {
    getIsLoading: (state) => {
      return state.loaders.length > 0
    },
  },
})

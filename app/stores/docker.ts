import { defineStore } from 'pinia'

export const useDockerStore = defineStore('DockerStore', {
  state: (): DockerStoreState => {
    return {
      initialized: false,
      containers: [],
    }
  },
  actions: {
    async initialize() {
      try {
        this.containers = await $fetch<DockerStoreContainer[]>('/api/containers')
        this.initialized = true
        console.log('DockerStore initialized')
      }
      catch (error) {
        console.error('Failed to initialize DockerStore:', error)
        const toast = useToast()
        toast.add({
          title: 'Error',
          description: 'Failed to load Docker containers.',
          color: 'error',
        })
      }
    },
  },
  getters: {
    isInitialized: state => state.initialized,
    getContainers: state => state.containers,
  },
})

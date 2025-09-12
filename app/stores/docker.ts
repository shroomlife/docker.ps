import { defineStore } from 'pinia'

export const useDockerStore = defineStore('DockerStore', {
  state: (): DockerStoreState => {
    return {
      initialized: false,
      isLoadingContainers: false,
      containers: [],
      blockedContainerIds: [],
    }
  },
  actions: {
    async initialize() {
      await this.loadContainers()
      this.initialized = true
    },
    async loadContainers() {
      try {
        this.isLoadingContainers = true
        this.containers = await $fetch<DockerStoreContainer[]>('/api/containers/list')
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
      finally {
        this.isLoadingContainers = false
      }
    },
    addBlockedContainer(id: string) {
      if (!this.blockedContainerIds.includes(id)) {
        this.blockedContainerIds.push(id)
      }
    },
    removeBlockedContainer(id: string) {
      this.blockedContainerIds = this.blockedContainerIds.filter(blockedId => blockedId !== id)
    },
    updateContainer(updatedContainer: DockerStoreContainer) {
      const index = this.containers.findIndex(c => c.id === updatedContainer.id)
      if (index !== -1) {
        this.containers[index] = updatedContainer
      }
    },
    removeContainer(id: string) {
      this.containers = this.containers.filter(c => c.id !== id)
      this.removeBlockedContainer(id)
    },
  },
  getters: {
    isInitialized: state => state.initialized,
    getContainers: state => state.containers,
    getBlockedContainerIds: state => state.blockedContainerIds,
    getIsLoadingContainers: state => state.isLoadingContainers,
  },
})

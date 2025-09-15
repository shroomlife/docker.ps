import type { DockerHost } from '@prisma/client'
import { defineStore } from 'pinia'

export const useDockerStore = defineStore('DockerStore', {
  state: (): DockerStoreState => {
    return {
      currentHost: null,
      availableHosts: [],
      initialized: false,
      isLoadingContainers: false,
      containers: [],
      blockedContainerIds: [],
    }
  },
  actions: {
    async addHost(name: string, url: string, authKey: string) {
      const newHost = await $fetch<DockerHost>('/api/hosts/add', {
        method: 'POST',
        body: {
          name,
          url,
          authKey,
        } as DockerHostAddRequestBody,
      })
      this.availableHosts.push(newHost)
      if (!this.currentHost) {
        this.currentHost = newHost
      }
    },
    addHosts(hosts: DockerHost[]) {
      this.availableHosts = hosts
    },

    async setCurrentHost(uuid: string) {
      const foundHost = this.availableHosts.find(host => host.uuid === uuid)
      if (foundHost) {
        this.currentHost = foundHost
        return
      }
      throw new Error('Host Not Found')
    },

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
    getCurrentHost: state => state.currentHost,
    getHasCurrentHost: state => !!state.currentHost,
    getAvailableHosts: state => state.availableHosts,
    isInitialized: state => state.initialized,
    getContainers: state => state.containers,
    getBlockedContainerIds: state => state.blockedContainerIds,
    getIsLoadingContainers: state => state.isLoadingContainers,
  },
})

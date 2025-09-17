import type { DockerHost } from '@prisma/client'
import { defineStore } from 'pinia'

export const useDockerStore = defineStore('DockerStore', {
  state: (): DockerStoreState => {
    return {
      currentHost: null,
      availableHosts: [],
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

    async updateHost(uuid: string | undefined, name: string, url: string, authKey: string) {
      if (!uuid) {
        throw new Error('Host UUID is required for update')
      }
      const updatedHost = await $fetch<DockerHost>(`/api/hosts/edit`, {
        method: 'POST',
        body: {
          uuid,
          name,
          url,
          authKey,
        } as DockerHostEditRequestBody,
      })
      const index = this.availableHosts.findIndex(host => host.uuid === uuid)
      if (index !== -1) {
        this.availableHosts[index] = updatedHost
        if (this.currentHost?.uuid === uuid) {
          this.currentHost = updatedHost
        }
      }
    },

    addHosts(hosts: DockerHost[]) {
      this.availableHosts = hosts
      this.loadCurrentHostFromSession()
    },

    resetHostData() {
      this.containers = []
    },

    async setCurrentHost(uuid: string) {
      if (this.getCurrentHost?.uuid === uuid) return
      const foundHost = this.availableHosts.find(host => host.uuid === uuid)
      if (foundHost) {
        if (this.currentHost?.uuid === foundHost.uuid) return
        this.resetHostData()
        this.currentHost = foundHost
        this.loadContainers()
        sessionStorage.setItem('dockerCurrentHostUuid', uuid)
        return
      }
      throw new Error('Host Not Found')
    },

    loadCurrentHostFromSession() {
      const storedUuid = sessionStorage.getItem('dockerCurrentHostUuid')
      if (storedUuid) {
        const foundHost = this.availableHosts.find(host => host.uuid === storedUuid)
        if (foundHost) {
          this.currentHost = foundHost
        }
      }
    },

    async loadContainers() {
      if (!this.getHasCurrentHost) return
      const appStore = useAppStore()
      try {
        appStore.addLoader('dockerStore/loadContainers')
        this.isLoadingContainers = true
        this.containers = await $fetch<DockerStoreContainer[]>('/api/containers/list', {
          method: 'POST',
          body: {
            hostUuid: this.getCurrentHost?.uuid,
          } as DockerContainerListRequest,
        })
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
        appStore.removeLoader('dockerStore/loadContainers')
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
    getContainers: state => state.containers,
    getBlockedContainerIds: state => state.blockedContainerIds,
    getIsLoadingContainers: state => state.isLoadingContainers,
  },
})

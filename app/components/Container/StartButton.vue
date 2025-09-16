<script lang="ts" setup>
const dockerStore = useDockerStore()
const toast = useToast()

const { id } = defineProps({
  id: {
    type: String as PropType<string>,
    required: true,
  },
})

const isLoading = computed(() => {
  return dockerStore.getBlockedContainerIds.includes(id)
})

const startContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const startedContainer = await $fetch<DockerStoreContainer>('/api/containers/start', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.getCurrentHost?.uuid,
        containerId: id,
      } as DockerContainerStartRequest,
    })
    dockerStore.updateContainer(startedContainer)
  }
  catch (error) {
    console.error('Failed to start container:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to start container. Please try again.',
      color: 'error',
    })
  }
  finally {
    dockerStore.removeBlockedContainer(id)
  }
}
</script>

<template>
  <UButton
    square
    size="lg"
    color="info"
    variant="soft"
    icon="tabler:player-play-filled"
    :loading="isLoading"
    @click="startContainer"
  />
</template>

<style lang="scss" scoped>

</style>

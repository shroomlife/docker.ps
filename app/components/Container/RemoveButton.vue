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

const removeContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const isRemoved = await $fetch<DockerStoreContainer>('/api/containers/remove', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.getCurrentHost?.uuid,
        containerId: id,
      } as DockerContainerRemoveRequest,
    })
    if (isRemoved) {
      dockerStore.removeContainer(id)
    }
  }
  catch (error) {
    console.error('Failed to stop container:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to remove container. Please try again.',
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
    color="error"
    variant="soft"
    icon="tabler:trash"
    :loading="isLoading"
    @click="removeContainer"
  />
</template>

<style lang="scss" scoped>

</style>

<script lang="ts" setup>
const dockerStore = useDockerStore()
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
      body: { id } as DockerContainerRemoveRequest,
    })
    if (isRemoved) {
      dockerStore.removeContainer(id)
    }
  }
  catch (error) {
    console.error('Failed to stop container:', error)
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

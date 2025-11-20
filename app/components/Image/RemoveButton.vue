<script lang="ts" setup>
const dockerStore = useDockerStore()
const toast = useToast()
const route = useRoute()

const { id } = defineProps({
  id: {
    type: String as PropType<string>,
    required: true,
  },
})

const isLoading = ref(false)

const removeImage = async () => {
  isLoading.value = true
  try {
    const isRemoved = await $fetch<boolean>('/api/images/remove', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.getCurrentHost?.uuid,
        imageId: id,
      } as DockerImageRemoveRequest,
    })
    if (isRemoved) {
      dockerStore.removeImage(id)
      toast.add({
        title: 'Success',
        description: 'Image has been removed.',
        color: 'success',
      })
      // Navigate to images list if we're on the detail page
      if (route.path.startsWith('/app/images/') && route.params.id === id) {
        navigateTo('/app/images')
      }
    }
  }
  catch (error) {
    console.error('Failed to remove image:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to remove image. Please try again.',
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
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
    @click="removeImage"
  />
</template>

<style lang="scss" scoped>

</style>

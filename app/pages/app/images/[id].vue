<script lang="ts" setup>
import type { ImageInspectInfo } from 'dockerode'

definePageMeta({
  layout: 'app',
})

const isLoading = ref<boolean>(true)
const toast = useToast()
const dockerStore = useDockerStore()

const currentRoute = useRoute()
if (!currentRoute.params.id) {
  toast.add({
    title: 'Error',
    description: 'No Image provided',
    color: 'error',
  })
  navigateTo('/app/images')
}

const image = ref<ImageInspectInfo | null>(null)
const imageId = computed(() => currentRoute.params.id as string)

const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const computedTitle = computed(() => {
  if (!image.value) return 'Loading...'
  const repoTag = image.value.RepoTags && image.value.RepoTags.length > 0
    ? image.value.RepoTags[0]
    : '<none>:<none>'
  return repoTag || '<none>:<none>'
})

const breadcrumbItems = computed(() => {
  return [
    {
      label: dockerStore.getCurrentHost?.name || '',
      icon: 'tabler:photo',
      to: '/app/images',
    },
    {
      label: computedTitle.value,
      icon: 'tabler:photo-filled',
    },
  ]
})

const getRepositoryTag = (repoTags: string[] | null | undefined): { repository: string; tag: string } => {
  if (!repoTags || repoTags.length === 0) {
    return { repository: '<none>', tag: '<none>' }
  }
  const repoTag = repoTags[0]
  if (!repoTag) {
    return { repository: '<none>', tag: '<none>' }
  }
  if (repoTag.includes(':')) {
    const [repository, tag] = repoTag.split(':', 2)
    return { repository: repository || '<none>', tag: tag || '<none>' }
  }
  return { repository: repoTag, tag: 'latest' }
}

onMounted(async () => {
  try {
    isLoading.value = true
    image.value = await $fetch<ImageInspectInfo>(`/api/images`, {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost?.uuid,
        imageId: imageId.value,
      } as DockerImageGetRequest,
    })
  }
  catch (error) {
    console.error('Failed to fetch Image Details', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch Image Details',
      color: 'error',
    })
    navigateTo('/app/images')
  }
  finally {
    isLoading.value = false
  }
})
</script>

<template>
  <AppDashboardPage
    :title="computedTitle"
    :headline="dockerStore.getCurrentHost?.name"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>

    <!-- Image Info Card -->
    <UCard v-if="image">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Image Information
          </h3>
          <ImageRemoveButton :id="imageId" />
        </div>
      </template>
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Repository
            </p>
            <p class="font-mono text-sm">
              {{ getRepositoryTag(image.RepoTags).repository }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Tag
            </p>
            <p class="text-sm">
              {{ getRepositoryTag(image.RepoTags).tag }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Image ID
            </p>
            <p class="font-mono text-xs">
              {{ image.Id.length > 19 ? image.Id.substring(7, 19) : image.Id.substring(0, 12) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Created
            </p>
            <p class="text-sm">
              {{ new Date(image.Created).toLocaleString() }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Size
            </p>
            <p class="text-sm">
              {{ formatSize(image.Size) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Virtual Size
            </p>
            <p class="text-sm">
              {{ formatSize(image.VirtualSize) }}
            </p>
          </div>
          <div v-if="image.Parent">
            <p class="text-sm text-gray-500 mb-1">
              Parent Image
            </p>
            <p class="font-mono text-xs">
              {{ image.Parent.length > 19 ? image.Parent.substring(7, 19) : image.Parent.substring(0, 12) }}
            </p>
          </div>
          <div v-if="image.Architecture">
            <p class="text-sm text-gray-500 mb-1">
              Architecture
            </p>
            <p class="text-sm">
              {{ image.Architecture }}
            </p>
          </div>
          <div v-if="image.Os">
            <p class="text-sm text-gray-500 mb-1">
              Operating System
            </p>
            <p class="text-sm">
              {{ image.Os }}
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Image Layers Card -->
    <UCard v-if="image && image.RootFS && image.RootFS.Layers">
      <template #header>
        <h3 class="text-lg font-semibold">
          Image Layers
        </h3>
      </template>
      <div class="flex flex-col gap-2">
        <div
          v-for="(layer, index) in image.RootFS.Layers"
          :key="layer"
          class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded"
        >
          <UBadge
            variant="soft"
            color="info"
            size="sm"
          >
            Layer {{ index + 1 }}
          </UBadge>
          <p class="font-mono text-xs flex-1">
            {{ layer.length > 19 ? layer.substring(7, 19) : layer.substring(0, 12) }}
          </p>
        </div>
      </div>
    </UCard>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>


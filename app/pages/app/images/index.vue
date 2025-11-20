<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'
import moment from 'moment'

definePageMeta({
  layout: 'app',
})

const UButton = resolveComponent('UButton')
const dockerStore = useDockerStore()

const searchValue = ref<string>('')

const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const columns: TableColumn<DockerStoreImage>[] = [
  {
    accessorKey: 'repository',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Repository',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      })
    },
  },
  {
    accessorKey: 'tag',
    header: 'Tag',
  },
  {
    id: 'size',
    header: 'Size',
    accessorFn: row => formatSize(row.size),
  },
  {
    id: 'created',
    header: 'Created',
    accessorFn: row => moment.unix(row.created).fromNow(),
  },
  {
    id: 'actions',
    header: 'Actions',
  },
]

const computedImages = computed(() => {
  return dockerStore.getImages.filter(image =>
    image.repository.toLowerCase().includes(searchValue.value.toLowerCase())
    || image.tag.toLowerCase().includes(searchValue.value.toLowerCase())
    || image.id.toLowerCase().includes(searchValue.value.toLowerCase()),
  )
})

const breadcrumbItems = computed(() => {
  return [
    {
      label: dockerStore.getCurrentHost?.name || '',
      icon: 'tabler:stack-filled',
    },
  ]
})

const computedEditDockerHostLink = computed(() => {
  return dockerStore.getCurrentHost ? `/app/hosts/${dockerStore.getCurrentHost.uuid}/edit` : '/app/hosts'
})

const tableSorting = ref([
  {
    id: 'repository',
    desc: false,
  },
])

onMounted(async () => {
  if (!dockerStore.getHasCurrentHost) {
    return navigateTo('/app')
  }
  await dockerStore.loadImages()
})
</script>

<template>
  <AppDashboardPage
    v-if="dockerStore.getCurrentHost"
    title="Images"
    description="List of all Docker images"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
        <template #right>
          <UButton
            icon="tabler:edit"
            :to="computedEditDockerHostLink"
          >
            Edit Host
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>
    <div class="flex flex-col flex-1 w-full">
      <div class="flex justify-between px-4 py-3.5 border border-accented flex-wrap gap-4">
        <div class="flex gap-2 items-center font-medium flex-wrap">
          <UIcon
            size="24"
            name="tabler:photo"
          />
          <span>{{ computedImages.length }} Images</span>
        </div>
        <div class="flex items-center gap-1 grow justify-end">
          <UInput
            v-model="searchValue"
            placeholder="Search Images ..."
            size="lg"
            class="lg:w-72 grow sm:max-w-72"
            icon="tabler:search"
          />
          <UButton
            icon="tabler:refresh-dot"
            size="lg"
            color="neutral"
            variant="soft"
            :loading="dockerStore.getIsLoadingImages"
            @click="dockerStore.loadImages()"
          />
        </div>
      </div>

      <UTable
        v-model:sorting="tableSorting"
        :loading="dockerStore.getIsLoadingImages"
        :columns="columns"
        :data="computedImages"
        :ui="{
          tbody: '[&>tr]:hover:bg-elevated/50',
          th: 'text-md',
        }"
      >
        <template #repository-cell="{ row }">
          <UButton
            :label="row.original.repository"
            variant="link"
            :to="`/app/images/${row.original.id}`"
            size="xl"
            icon="tabler:photo"
            color="info"
            :ui="{
              base: 'w-full',
              label: 'text-lg',
            }"
          />
        </template>

        <template #tag-cell="{ row }">
          <UBadge
            variant="outline"
            color="info"
            size="lg"
          >
            {{ row.original.tag }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <ImageRemoveButton :id="row.original.id" />
        </template>
      </UTable>
    </div>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>

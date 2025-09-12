<script lang="ts" setup>
import type { TableColumn, BadgeProps } from '@nuxt/ui'
import moment from 'moment'

const dockerStore = useDockerStore()

const searchValue = ref<string>('')

const columns: TableColumn<DockerStoreContainer>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'image',
    header: 'Image',
  },
  {
    id: 'state',
    accessorKey: 'state',
    header: 'State',
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
  },
  {
    id: 'created',
    header: 'Created',
    accessorFn: row => moment.unix(row.created).fromNow(),
  },
]

const getStateBadgeColor = (state: string): BadgeProps['color'] => {
  switch (state) {
    case 'running':
      return 'success' as BadgeProps['color']
    case 'paused':
      return 'warning' as BadgeProps['color']
    case 'exited':
      return 'error' as BadgeProps['color']
    case 'created':
    case 'restarting':
    case 'removing':
      return 'info' as BadgeProps['color']
    case 'dead':
      return 'dark' as BadgeProps['color']
    default:
      return 'default' as BadgeProps['color']
  }
}

const computedContainers = computed(() => {
  return dockerStore.getContainers.filter(container =>
    container.name.toLowerCase().includes(searchValue.value.toLowerCase())
    || container.image.toLowerCase().includes(searchValue.value.toLowerCase())
    || container.status.toLowerCase().includes(searchValue.value.toLowerCase())
    || container.state.toLowerCase().includes(searchValue.value.toLowerCase()),
  )
})

onMounted(() => {
  dockerStore.initialize()
})
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar />
    </template>
    <template #body>
      <UPage>
        <UPageHeader
          title="Containers"
          description="List of all running Docker containers."
        />
        <UPageBody>
          <div class="flex flex-col flex-1 w-full">
            <div class="flex justify-between px-4 py-3.5 border border-accented">
              <div class="flex gap-2 items-center font-medium flex-wrap">
                <UIcon
                  size="24"
                  name="tabler:stack-2"
                />
                <span>{{ computedContainers.length }} Containers</span>
              </div>
              <UInput
                v-model="searchValue"
                placeholder="Search containers..."
                size="lg"
                class="lg:w-72"
                trailing-icon="tabler:search"
              />
            </div>

            <UTable
              :loading="!dockerStore.isInitialized"
              :columns="columns"
              :data="computedContainers"
            >
              <template #state-cell="{ row }">
                <UBadge
                  :color="getStateBadgeColor(row.original.state)"
                  variant="soft"
                >
                  {{ row.original.state }}
                </UBadge>
              </template>

              <template #image-cell="{ row }">
                <div class="flex gap-1">
                  <UBadge
                    variant="solid"
                    color="info"
                  >
                    {{ String(row.original.image).split(':')[0] }}
                  </UBadge>
                  :
                  <UBadge
                    variant="soft"
                    color="info"
                  >
                    {{ String(row.original.image).split(':')[1] }}
                  </UBadge>
                </div>
              </template>
            </UTable>
          </div>
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>

<style lang="scss" scoped>

</style>

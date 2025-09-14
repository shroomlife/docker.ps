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
  {
    id: 'actions',
    header: 'Actions',
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
    <template
      #header
    >
      <UDashboardNavbar class="lg:hidden" />
    </template>
    <template #body>
      <UPage>
        <UPageHeader
          title="Containers"
          description="List of all running Docker containers."
        />
        <UPageBody>
          <div class="flex flex-col flex-1 w-full">
            <div class="flex justify-between px-4 py-3.5 border border-accented flex-wrap gap-4">
              <div class="flex gap-2 items-center font-medium flex-wrap">
                <UIcon
                  size="24"
                  name="tabler:stack-2"
                />
                <span>{{ computedContainers.length }} Containers</span>
              </div>
              <div class="flex items-center gap-1 grow justify-end">
                <UInput
                  v-model="searchValue"
                  placeholder="Search Containers ..."
                  size="lg"
                  class="lg:w-72 grow sm:max-w-72"
                  icon="tabler:search"
                />
                <UButton
                  icon="tabler:refresh-dot"
                  size="lg"
                  color="neutral"
                  variant="soft"
                  :loading="dockerStore.getIsLoadingContainers"
                  @click="dockerStore.loadContainers()"
                />
              </div>
            </div>

            <UTable
              :loading="dockerStore.getIsLoadingContainers"
              :columns="columns"
              :data="computedContainers"
              :ui="{
                tbody: '[&>tr]:hover:bg-elevated/50',
                th: 'text-md',
              }"
            >
              <template #state-cell="{ row }">
                <UBadge
                  :color="getStateBadgeColor(row.original.state)"
                  variant="solid"
                  size="lg"
                >
                  {{ row.original.state }}
                </UBadge>
              </template>

              <template #image-cell="{ row }">
                <div class="flex gap-2 items-center">
                  <UBadge
                    variant="soft"
                    color="info"
                    size="lg"
                  >
                    {{ String(row.original.image).split(':')[0] }}
                  </UBadge>
                  <UBadge
                    variant="outline"
                    color="info"
                    size="lg"
                  >
                    {{ String(row.original.image).split(':')[1] }}
                  </UBadge>
                </div>
              </template>

              <template #name-cell="{ row }">
                <UButton
                  :label="row.original.name"
                  variant="link"
                  :to="`/containers/${row.original.id}`"
                  size="xl"
                  icon="tabler:stack-filled"
                  color="info"
                  :ui="{
                    base: 'w-full',
                    label: 'text-lg',
                  }"
                />
              </template>

              <template #actions-cell="{ row }">
                <div
                  class="flex gap-2 items-center"
                >
                  <ContainerUnpauseButton
                    v-if="row.original.state === 'paused'"
                    :id="row.original.id"
                  />
                  <ContainerStartButton
                    v-if="row.original.state === 'exited'"
                    :id="row.original.id"
                  />
                  <ContainerPauseButton
                    v-if="row.original.state === 'running'"
                    :id="row.original.id"
                  />
                  <ContainerRestartButton
                    v-if="row.original.state !== 'exited'"
                    :id="row.original.id"
                  />
                  <ContainerStopButton
                    v-if="row.original.state !== 'exited'"
                    :id="row.original.id"
                  />
                  <ContainerRemoveButton
                    v-if="row.original.state === 'exited'"
                    :id="row.original.id"
                  />
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

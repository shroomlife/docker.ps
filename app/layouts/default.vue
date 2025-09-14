<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const userStore = useUserStore()

const runtimeConfig = useRuntimeConfig()
const appVersion = runtimeConfig.public.appVersion || '0.0.0'

const navigationItems: ComputedRef<NavigationMenuItem[]> = computed(() => {
  const route = useRoute()
  return [
    {
      label: 'Containers',
      icon: 'tabler:stack-2',
      to: '/containers',
      active: route.path.startsWith('/containers'),
    },
  ]
})

onMounted(() => {
  if (!userStore.isLoggedIn) {
    navigateTo('/auth/login')
  }
})
</script>

<template>
  <UDashboardGroup
    v-if="userStore.isLoggedIn"
  >
    <UDashboardSidebar :ui="{ footer: 'border-t border-default', header: 'border-b border-default' }">
      <template #header>
        <NuxtLink
          class="flex justify-start items-center gap-2 hover:opacity-80"
          to="/"
        >
          <MainIcon
            :width="32"
            :height="32"
          />
          <span class="text-lg font-bold">docker.ps</span>
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
        />
      </template>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <span>docker.ps</span>
          <UBadge
            variant="soft"
            color="neutral"
          >
            v{{ appVersion }}
          </UBadge>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<style lang="scss" scoped></style>

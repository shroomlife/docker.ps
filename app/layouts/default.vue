<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const userStore = useUserStore()
const router = useRouter()

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

router.beforeEach((to) => {
  if (userStore.getIsInitialized && !userStore.getIsLoggedIn && to.path.startsWith('/auth') === false) {
    return navigateTo('/auth/login')
  }
})

onBeforeMount(async () => {
  await userStore.initialize()
  if (!userStore.getIsLoggedIn) {
    navigateTo('/auth/login')
  }
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar :ui="{ footer: 'border-t border-default', header: 'border-b border-default' }">
      <template #header>
        <MainLogo />
      </template>

      <template #default>
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
        />
      </template>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <span class="font-bold">docker.ps</span>
          <UBadge
            variant="soft"
            color="neutral"
            size="lg"
          >
            v{{ appVersion }}
          </UBadge>
        </div>
      </template>
    </UDashboardSidebar>

    <template v-if="userStore.getIsInitialized">
      <slot v-if="userStore.getIsLoggedIn" />
      <LoginBlocker v-else />
    </template>
    <LoadingBlocker v-else />
  </UDashboardGroup>
</template>

<style lang="scss" scoped></style>

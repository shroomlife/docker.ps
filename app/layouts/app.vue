<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const userStore = useUserStore()
const dockerStore = useDockerStore()
const router = useRouter()

const runtimeConfig = useRuntimeConfig()
const appVersion = runtimeConfig.public.appVersion || '0.0.0'

if (!userStore.hasAuthCookie()) {
  await navigateTo('/login')
}

const navigationItems: ComputedRef<NavigationMenuItem[]> = computed(() => {
  const route = useRoute()
  return [
    {
      label: 'Dashboard',
      icon: 'tabler:home',
      to: '/dashboard',
      active: route.path.startsWith('/dashboard'),
    },
  ]
})

const hostNavigationItems: ComputedRef<NavigationMenuItem[]> = computed(() => {
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

const bottomNavigationItems = computed<NavigationMenuItem[]>(() => {
  return [
    {
      label: 'Logout',
      icon: 'tabler:logout',
      to: '/auth/logout',
      active: false,
    },
  ]
})

router.beforeEach((to) => {
  if (userStore.getIsInitialized && !userStore.getIsLoggedIn && to.path.startsWith('/login') === false) {
    return navigateTo('/login')
  }
})

onBeforeMount(async () => {
  await userStore.initialize()
  if (!userStore.getIsLoggedIn) {
    navigateTo('/login')
  }
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar :ui="{ footer: 'border-t border-default', header: 'border-b border-default' }">
      <template #header>
        <MainLogo to="/dashboard" />
      </template>

      <template #default>
        <div class="flex flex-col justify-between h-full w-full">
          <div class="flex flex-col justify-start gap-2">
            <UNavigationMenu
              :items="navigationItems"
              orientation="vertical"
              :ui="{
                link: 'text-base',
                linkLeadingIcon: 'w-6 h-6',
              }"
            />

            <AppHostSelect />

            <UNavigationMenu
              v-if="dockerStore.getHasCurrentHost"
              :items="hostNavigationItems"
              orientation="vertical"
              :ui="{
                link: 'text-base',
                linkLeadingIcon: 'w-6 h-6',
              }"
            />
          </div>

          <UNavigationMenu
            :items="bottomNavigationItems"
            orientation="vertical"
            :ui="{
              link: 'text-base',
              linkLeadingIcon: 'w-6 h-6',
            }"
          />
        </div>
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

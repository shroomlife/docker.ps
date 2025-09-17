<script lang="ts" setup>
const appStore = useAppStore()
const userStore = useUserStore()
const dockerStore = useDockerStore()
const router = useRouter()

const runtimeConfig = useRuntimeConfig()
const appVersion = runtimeConfig.public.appVersion || '0.0.0'

if (!userStore.hasAuthCookie()) {
  await navigateTo('/profile/login')
}

const appTopNavigation = useAppTopNavigation()
const appMainNavigation = useAppMainNavigation()
const appFooterNavigation = useAppFooterNavigation()

router.beforeEach((to) => {
  if (userStore.getIsInitialized && !userStore.getIsLoggedIn && to.path.startsWith('/profile/login') === false) {
    return navigateTo('/profile/login')
  }
})

appStore.addLoader('userStore/initialize')
onMounted(async () => {
  if (userStore.getIsInitialized === false) {
    await userStore.initialize()
  }
  else {
    appStore.removeLoader('userStore/initialize')
  }
  if (!userStore.getIsLoggedIn) {
    navigateTo('/profile/login')
  }
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      class="min-w-80"
      :ui="{ footer: 'border-t border-default', header: 'border-b border-default' }"
    >
      <template #header>
        <MainLogo
          class="w-full"
          to="/app"
        />
      </template>

      <template #default>
        <div class="flex flex-col justify-between h-full w-full">
          <div class="flex flex-col justify-start gap-2">
            <UNavigationMenu
              :items="appTopNavigation"
              orientation="vertical"
              :ui="{
                link: 'text-base',
                linkLeadingIcon: 'w-6 h-6',
              }"
            />

            <USeparator />

            <AppHostSelect />

            <UNavigationMenu
              v-if="dockerStore.getHasCurrentHost"
              :items="appMainNavigation"
              orientation="vertical"
              :ui="{
                link: 'text-base',
                linkLeadingIcon: 'w-6 h-6',
              }"
            />
          </div>

          <UNavigationMenu
            :items="appFooterNavigation"
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

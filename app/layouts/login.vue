<script lang="ts" setup>
const userStore = useUserStore()
onMounted(async () => {
  const route = useRoute()
  if (route.path === '/auth/logout') return

  await userStore.initialize()
  if (userStore.getIsLoggedIn) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <UDashboardGroup>
    <UDashboardPanel
      class="items-center justify-center"
      :ui="{
        body: 'w-full items-center',
      }"
    >
      <template #body>
        <div class="flex flex-col items-center justify-center gap-4 w-full max-w-lg grow">
          <UCard class="w-full max-w-lg">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <MainLogo />
                <UBadge
                  icon="tabler:shield-lock-filled"
                  size="lg"
                >
                  Authentication
                </UBadge>
              </div>
            </template>
            <template #default>
              <slot />
            </template>
            <template #footer>
              <div class="flex justify-end gap-3 w-full text-sm">
                <NuxtLink
                  to="/privacy"
                  class="underline"
                >
                  Privacy Policy
                </NuxtLink>
                <NuxtLink
                  to="/imprint"
                  class="underline"
                >
                  Imprint
                </NuxtLink>
              </div>
            </template>
          </UCard>
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<style lang="scss" scoped>

</style>

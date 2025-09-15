<script lang="ts" setup>
const userStore = useUserStore()

definePageMeta({
  layout: 'login',
})

onMounted(async () => {
  try {
    const currentRoute = useRoute()
    const { state, code } = currentRoute.query
    if (!code || !state) {
      throw new Error('Invalid Query Parameters')
    }
    await userStore.callbackLoginWithGoogle(String(code), String(state))
  }
  catch (error) {
    console.error('Google OAuth Callback Error:', error)
    const toast = useToast()
    toast.add({
      title: 'Authentication Error',
      description: 'There was an error during Google authentication. Please try again.',
      color: 'error',
      duration: 5000,
      icon: 'tabler:alert-circle',
    })
    setTimeout(() => {
      navigateTo('/auth/login')
    }, 4000)
  }
})
</script>

<template>
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
            <div class="flex justify-center items-center w-full h-64 rounded-lg bg-gray-100 p-4">
              <div class="flex flex-col justify-center items-center gap-3">
                <UIcon
                  name="material-icon-theme:google"
                  class="animate-bounce"
                  size="64"
                />
                <div class="text-lg font-semibold text-center">
                  Du wirst sicher mit Google angemeldet.
                </div>
              </div>
            </div>
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
</template>

<style lang="scss" scoped>

</style>

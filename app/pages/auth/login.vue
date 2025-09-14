<script setup lang="ts">
const userStore = useUserStore()

definePageMeta({
  layout: 'login',
})

onMounted(() => {
  if (userStore.isLoggedIn) {
    navigateTo('/containers')
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
              <UBadge
                icon="tabler:shield-lock-filled"
                size="lg"
              >
                Authentication
              </UBadge>
            </div>
          </template>
          <template #default>
            <GoogleLoginButton />
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

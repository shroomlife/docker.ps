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
    navigateTo('/dashboard')
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

<style lang="scss" scoped>

</style>

<script setup lang="ts">
const userStore = useUserStore()

useHead({
  bodyAttrs: {
    class: 'login-background',
  },
})

onMounted(() => {
  if (userStore.getIsLoggedIn) {
    navigateTo('/')
  }
})
</script>

<template>
  <AuthCard>
    <GoogleLoginButton />
    <div class="text-sm text-center text-muted">
      By registering or logging in, you agree to our <NuxtLink
        to="/legal/privacy"
        class="underline"
      >Privacy Policy</NuxtLink>.
    </div>
  </AuthCard>
</template>

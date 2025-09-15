<script setup lang="ts">
const userStore = useUserStore()

definePageMeta({
  layout: 'login',
})

onMounted(() => {
  if (userStore.getIsLoggedIn) {
    navigateTo('/')
  }
})
</script>

<template>
  <GoogleLoginButton />
</template>

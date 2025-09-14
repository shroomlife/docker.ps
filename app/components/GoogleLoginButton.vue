<script lang="ts" setup>
const userStore = useUserStore()
const isLoading = ref<boolean>(false)

const handleLogin = async () => {
  try {
    isLoading.value = true
    await userStore.loginWithGoogle()
  }
  catch (error) {
    console.error('Login error:', error)
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UButton
    block
    icon="i-simple-icons-google"
    color="neutral"
    size="xl"
    variant="soft"
    :loading="isLoading"
    @click="handleLogin"
  >
    Continue with Google
  </UButton>
</template>

<style lang="scss" scoped>

</style>

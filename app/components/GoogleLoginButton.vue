<script lang="ts" setup>
const userStore = useUserStore()
const isLoading = ref<boolean>(false)
const isDisabled = ref<boolean>(true)

const handleLogin = async () => {
  try {
    isLoading.value = true
    await userStore.loginWithGoogle()
  }
  catch (error) {
    console.error('Login error:', error)
    isLoading.value = false
  }
}

onMounted(() => {
  isDisabled.value = false
})
</script>

<template>
  <UButton
    block
    icon="material-icon-theme:google"
    color="neutral"
    size="xl"
    variant="soft"
    :loading="isLoading"
    :disabled="isDisabled"
    @click="handleLogin"
  >
    Continue with Google
  </UButton>
</template>

<style lang="scss" scoped>

</style>

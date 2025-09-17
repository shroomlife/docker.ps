<script setup lang="ts">
const userStore = useUserStore()

useHead({
  bodyAttrs: {
    class: 'login-background',
  },
})

onMounted(() => {
  userStore.logout()
  const toast = useToast()
  toast.add({
    title: 'Ausgeloggt',
    description: 'Du wurdest erfolgreich ausgeloggt.',
    color: 'success',
    duration: 5000,
    icon: 'tabler:logout',
  })
  setTimeout(() => {
    navigateTo('/profile/login')
  }, 2000)
})
</script>

<template>
  <AuthCard>
    <div class="flex justify-center items-center w-full h-64 rounded-lg bg-gray-100 p-4">
      <div class="flex flex-col justify-center items-center gap-3">
        <UIcon
          name="tabler:logout"
          class="animate-bounce"
          size="64"
        />
        <div class="text-lg font-semibold text-center">
          Du wirst ausgeloggt.
        </div>
      </div>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const userStore = useUserStore()
const route = useRoute()

const headerItems: NavigationMenuItem[] = [
  // {
  //   label: 'Privacy Policy',
  //   to: '/privacy-policy',
  //   active: route.path.startsWith('/privacy-policy'),
  // },
  // {
  //   label: 'Imprint',
  //   to: '/imprint',
  //   active: route.path.startsWith('/imprint'),
  // },
]

const footerItems: NavigationMenuItem[] = [
  {
    label: 'Privacy Policy',
    to: '/privacy-policy',
    active: route.path.startsWith('/privacy-policy'),
  },
  {
    label: 'Imprint',
    to: '/imprint',
    active: route.path.startsWith('/imprint'),
  },
]

onMounted(() => {
  userStore.initialize()
})
</script>

<template>
  <UMain class="min-h-dvh flex flex-col justify-start">
    <UHeader>
      <template #left>
        <MainLogo to="/" />
      </template>

      <template #right>
        <UButton
          v-if="!userStore.getIsLoggedIn"
          label="Login"
          color="neutral"
          variant="outline"
          to="/login"
        />
        <UButton
          v-else
          label="Zur App"
          color="primary"
          to="/app"
        />
      </template>

      <template #body>
        <UNavigationMenu
          :items="headerItems"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    <UContainer class="flex flex-col grow">
      <slot />
    </UContainer>
    <UFooter class="bg-default/75 backdrop-blur">
      <UNavigationMenu
        :items="footerItems"
        variant="link"
      />
    </UFooter>
  </UMain>
</template>

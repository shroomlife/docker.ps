<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

const navigationItems: NavigationMenuItem[] = [
  {
    label: 'Containers',
    icon: 'tabler:stack-2',
    to: '/',
  },
]
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <template #header>
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
      </template>

      <template #default>
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
        />
      </template>

      <template #footer>
        <div>&copy; {{ new Date().getFullYear() }} shroomlife</div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>

<style lang="scss" scoped></style>

<script lang="ts" setup>

</script>

<template>
  <UDashboardPanel>
    <template
      #header
    >
      <UDashboardNavbar class="lg:hidden" />
    </template>
    <template #body>
      <div class="w-full h-full bg-gray-100 rounded-lg flex justify-center items-center">
        <UIcon
          name="tabler:loader"
          size="64"
          class="animate-spin text-primary"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<style lang="scss" scoped>

</style>

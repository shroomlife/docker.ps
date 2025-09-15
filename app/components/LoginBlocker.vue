<script lang="ts" setup>
navigateTo('/login')
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
        <UButton
          label="Zum Login"
          to="/login"
          size="xl"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<style lang="scss" scoped>

</style>

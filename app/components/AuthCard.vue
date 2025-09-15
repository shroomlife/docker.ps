<script lang="ts" setup>

</script>

<template>
  <div class="w-full grow flex justify-center items-center">
    <UCard class="flex-1 max-w-lg mx-auto">
      <template #header>
        <div class="flex justify-between items-center">
          <h1 class="text-3xl text-center md:text-left w-full md:w-auto font-bold">
            Authentication
          </h1>
          <UBadge
            class="hidden md:flex"
            label="SSL Secured"
            icon="tabler:lock-check"
            size="lg"
          />
        </div>
      </template>
      <template #default>
        <div class="flex flex-col gap-2 justify-center">
          <slot />
        </div>
      </template>
    </UCard>
  </div>
</template>

<style lang="scss" scoped>

</style>

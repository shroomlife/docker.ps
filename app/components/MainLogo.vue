<script lang="ts" setup>
const { to } = defineProps({
  to: {
    type: String as PropType<string>,
    default: '/',
  },
})
</script>

<template>
  <NuxtLink
    class="flex justify-start items-center gap-2 hover:opacity-80"
    :to="to"
  >
    <MainIcon
      :width="32"
      :height="32"
    />
    <span class="text-xl font-bold">docker.ps</span>
  </NuxtLink>
</template>

<style lang="scss" scoped>

</style>

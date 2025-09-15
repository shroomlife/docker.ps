<script lang="ts" setup>
const { title } = defineProps({
  title: {
    type: String as PropType<string>,
    required: true,
  },
  headline: {
    type: String as PropType<string>,
    required: false,
  },
  description: {
    type: String as PropType<string>,
    required: false,
  },
})
</script>

<template>
  <UDashboardPanel>
    <template
      #header
    >
      <UDashboardNavbar class="lg:hidden" />
    </template>
    <template #body>
      <UPage>
        <UPageHeader
          :title="title"
          :description="description"
          :headline="headline"
        />
        <UPageBody>
          <slot />
        </UPageBody>
      </UPage>
    </template>
  </UDashboardPanel>
</template>

<style lang="scss" scoped>

</style>

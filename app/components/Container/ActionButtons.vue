<script lang="ts" setup>
const { id, state } = defineProps({
  id: {
    type: String as PropType<string>,
    required: true,
  },
  state: {
    type: String as PropType<string>,
    required: true,
  },
})
</script>

<template>
  <div
    class="flex gap-2 items-center"
  >
    <ContainerUnpauseButton
      v-if="state === 'paused'"
      :id="id"
    />
    <ContainerStartButton
      v-if="state === 'exited'"
      :id="id"
    />
    <ContainerPauseButton
      v-if="state === 'running'"
      :id="id"
    />
    <ContainerRestartButton
      v-if="state !== 'exited'"
      :id="id"
    />
    <ContainerStopButton
      v-if="state !== 'exited'"
      :id="id"
    />
    <ContainerRemoveButton
      v-if="state === 'exited'"
      :id="id"
    />
  </div>
</template>

<style lang="scss" scoped>

</style>

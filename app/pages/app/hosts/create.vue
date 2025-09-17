<script lang="ts" setup>
import * as v from 'valibot'
import type { FormSubmitEvent } from '@nuxt/ui'

const dockerStore = useDockerStore()

definePageMeta({
  layout: 'app',
})

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  url: v.pipe(v.string(), v.url('Invalid URL')),
  authKey: v.pipe(v.string(), v.minLength(128, 'Auth Key must be at least 128 characters long'), v.startsWith('docker_ps_', 'Auth Key must start with "docker_ps_"')),
})

type Schema = v.InferOutput<typeof schema>

const state = reactive({
  name: '',
  url: '',
  authKey: '',
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await dockerStore.addHost(event.data.name, event.data.url, event.data.authKey)
    toast.add({
      title: 'Added',
      description: 'The Docker Host has been added successfully.',
      color: 'success',
    })
    navigateTo('/app')
  }
  catch (error) {
    console.error('Failed to add Docker host:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to add Docker Host.',
      color: 'error',
    })
  }
}

const breadcrumbItems = ref([
  {
    label: 'Docker Hosts',
    icon: 'tabler:stack-front',
    to: '/app',
  },
  {
    label: 'Add Docker Host',
    icon: 'tabler:square-rounded-plus',
  },
])
</script>

<template>
  <AppDashboardPage
    title="Add Docker Host"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>
    <UForm
      :schema="schema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        size="xl"
        label="Name"
        name="name"
      >
        <UInput
          v-model="state.name"
          class="w-full"
        />
      </UFormField>
      <UFormField
        size="xl"
        label="Docker Host URL"
        name="url"
      >
        <UInput
          v-model="state.url"
          type="url"
          class="w-full"
          placeholder="https://"
        />
      </UFormField>
      <UFormField
        size="xl"
        label="Docker Host Auth Key"
        name="authKey"
      >
        <UInput
          v-model="state.authKey"
          class="w-full"
          type="password"
        />
      </UFormField>

      <UButton
        size="xl"
        type="submit"
        icon="tabler:square-rounded-plus"
        label="Add"
      />
    </UForm>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>

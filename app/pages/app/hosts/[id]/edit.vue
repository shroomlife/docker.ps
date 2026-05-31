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
  // Optional on edit: an empty value keeps the currently stored key, a provided
  // value must be a valid auth key. The secret is never sent back to the client.
  authKey: v.union([
    v.literal(''),
    v.pipe(v.string(), v.minLength(128, 'Auth Key must be at least 128 characters long'), v.startsWith('docker_ps_', 'Auth Key must start with "docker_ps_"')),
  ]),
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
    await dockerStore.updateHost(dockerStore.getCurrentHost?.uuid, event.data.name, event.data.url, event.data.authKey)
    toast.add({
      title: 'Updated',
      description: 'The Docker Host has been updated successfully.',
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
    label: dockerStore.getCurrentHost?.name || 'Docker Host',
    icon: 'tabler:stack-front',
    to: '/app/containers',
  },
  {
    label: 'Edit Docker Host',
    icon: 'tabler:edit',
  },
])

onMounted(async () => {
  const currentHost = await $fetch<DockerHostPublic>('/api/hosts', {
    method: 'POST',
    body: {
      hostUuid: dockerStore.getCurrentHost?.uuid,
    } as DockerHostGetRequest,
  })
  state.name = currentHost.name
  state.url = currentHost.url
  // authKey is intentionally not prefilled — the secret never leaves the server.
  // Leaving it blank keeps the stored key (see edit.post.ts).
})
</script>

<template>
  <AppDashboardPage
    title="Edit Docker Host"
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
        description="Leave blank to keep the current key."
      >
        <UInput
          v-model="state.authKey"
          class="w-full"
          type="password"
          placeholder="••••••••  (unchanged)"
        />
      </UFormField>

      <UButton
        size="xl"
        type="submit"
        icon="tabler:check"
        label="Save"
      />
    </UForm>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>

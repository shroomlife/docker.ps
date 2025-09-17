import type { NavigationMenuItem } from '@nuxt/ui'

export const useAppMainNavigation = (): ComputedRef<NavigationMenuItem[]> => {
  return computed(() => {
    const route = useRoute()
    return [
      {
        label: 'Containers',
        icon: 'tabler:stack',
        to: '/app/containers',
        active: route.path.startsWith('/app/containers'),
      },
    ]
  })
}

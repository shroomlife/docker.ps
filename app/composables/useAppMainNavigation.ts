import type { NavigationMenuItem } from '@nuxt/ui'

export const useAppMainNavigation = (): ComputedRef<NavigationMenuItem[]> => {
  return computed(() => {
    const route = useRoute()
    return [
      {
        label: 'Containers',
        icon: 'tabler:stack',
        to: '/containers',
        active: route.path.startsWith('/containers'),
      },
    ]
  })
}

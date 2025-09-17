import type { NavigationMenuItem } from '@nuxt/ui'

export const useAppTopNavigation = (): ComputedRef<NavigationMenuItem[]> => {
  return computed(() => {
    const route = useRoute()
    return [
      {
        label: 'Docker Hosts',
        icon: 'tabler:stack-front',
        to: '/app',
        active: route.path === '/app',
      },
    ]
  })
}

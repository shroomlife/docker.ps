import type { NavigationMenuItem } from '@nuxt/ui'

export const useAppFooterNavigation = (): ComputedRef<NavigationMenuItem[]> => {
  return computed(() => {
    const route = useRoute()
    return [
      {
        label: 'Settings',
        icon: 'tabler:settings',
        to: '/profile/settings',
        active: route.path.startsWith('/profile/settings'),
      },
      {
        label: 'Logout',
        icon: 'tabler:logout',
        to: '/auth/logout',
        active: route.path.startsWith('/auth/logout'),
      },
    ]
  })
}

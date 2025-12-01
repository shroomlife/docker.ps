declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue'

  export const DynamicScroller: DefineComponent<{
    items: unknown[]
    minItemSize?: number
    keyField?: string
    direction?: 'vertical' | 'horizontal'
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
    listTag?: string
    listClass?: string | string[] | Record<string, boolean>
    itemTag?: string
    itemClass?: string | string[] | Record<string, boolean>
  }>

  export const DynamicScrollerItem: DefineComponent<{
    item: unknown
    active?: boolean
    sizeDependencies?: unknown[]
    watchData?: boolean
    tag?: string
    emitResize?: boolean
  }>

  export const RecycleScroller: DefineComponent<{
    items: unknown[]
    itemSize?: number | null
    keyField?: string
    direction?: 'vertical' | 'horizontal'
    buffer?: number
    pageMode?: boolean
    prerender?: number
    emitUpdate?: boolean
    listTag?: string
    listClass?: string | string[] | Record<string, boolean>
    itemTag?: string
    itemClass?: string | string[] | Record<string, boolean>
  }>
}

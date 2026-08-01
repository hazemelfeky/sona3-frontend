import type { NuxtUIOptions } from '@nuxt/ui/vite'

export default <NuxtUIOptions>{
  colorMode: false,
  theme: {
    colors: ['navy', 'purple', 'amber', 'blue', 'gray', 'red', 'green'],
  },
  autoImport: {
    imports: [
      'vue',
      'vue-router',
      'pinia',
      {
        '@/store': ['useStore'],
        '@unhead/vue': ['useHead'],
        '@iconify/vue': ['Icon'],
      },
    ],
    dts: 'auto-imports.d.ts',
    vueTemplate: true,
  },
  colors: {
    primary: 'navy',
    secondary: 'purple',
    warning: 'amber',
    info: 'blue',
    success: 'green',
    error: 'red',
    neutral: 'gray',
  },
  ui: {
    select: {
      slots: {
        root: 'bg-elevated rounded-xl py-2',
        input: 'text-highlighted',
        base: 'placeholder:text-dimmed',
        content: 'bg-elevated rounded-lg ring-1 ring-default text-highlighted',
      },
    },
    button: {
      slots: {
        root: 'rounded-xl py-2 px-5 cursor-pointer hover:opacity-80 transition-opacity',
        base: 'cursor-pointer',
      },
      variants: { variant: { solid: { base: 'disabled:opacity-40' } } },
      compoundVariants: [
        {
          color: 'primary' as const,
          variant: 'solid' as const,
          class: {
            root: 'hover:opacity-100',
          },
        },
      ],
    },
    input: {
      slots: {
        root: 'bg-elevated rounded-xl py-1',
        input: 'text-highlighted',
        base: 'placeholder:text-dimmed ring-0 border border-default',
      },
      defaultVariants: { variant: 'none' },
      variants: {
        fieldGroup: {
          horizontal: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-e-none group-not-only:group-last:rounded-s-none group-not-last:group-not-first:rounded-none',
          },
          vertical: {
            root: 'group has-focus-visible:z-[1]',
            base: 'group-not-only:group-first:rounded-b-none group-not-only:group-last:rounded-t-none group-not-last:group-not-first:rounded-none',
          },
        },
      },
    },

    card: {
      slots: {
        root: 'rounded-lg overflow-hidden ring-0',
        header: 'p-4 sm:px-6',
        body: 'sm:p-0 sm:pt-0 h-full',
        footer: 'p-4 sm:px-6',
      },
      defaultVariants: { variant: 'soft' },
    },
    dropdownMenu: {
      slots: {
        content: 'z-[100] bg-elevated text-highlighted ring-1 ring-default rounded-xl shadow-xl p-1.5',
        viewport: 'relative divide-y divide-default scroll-py-1 overflow-y-auto flex-1',
        arrow: 'fill-default',
        group: 'p-1 isolate',
        label: 'w-full flex items-center font-semibold text-highlighted',
        separator: '-mx-1 my-1 h-px bg-border',
        item: 'group relative w-full flex items-start select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-md data-disabled:cursor-not-allowed data-disabled:opacity-75',
        itemLeadingIcon: 'shrink-0',
        itemLeadingAvatar: 'shrink-0',
        itemLeadingAvatarSize: '',
        itemTrailing: 'ms-auto inline-flex gap-1.5 items-center',
        itemTrailingIcon: 'shrink-0',
        itemTrailingKbds: 'hidden lg:inline-flex items-center shrink-0',
        itemTrailingKbdsSize: '',
        itemWrapper: 'flex-1 flex flex-col text-start min-w-0',
        itemLabel: 'truncate',
        itemDescription: 'truncate text-muted',
        itemLabelExternalIcon: 'inline-block size-3 align-top text-dimmed',
      },
    },
    editorMentionMenu: {
      slots: {
        content:
          'min-w-64 max-w-96 max-h-96 bg-elevated border border-default rounded-xl shadow-2xl ring-0 overflow-hidden',
        viewport: 'relative divide-y divide-default scroll-py-1 overflow-y-auto flex-1',
        group: 'p-1.5 isolate',
        label: 'w-full flex items-center font-semibold text-toned',
        separator: '-mx-1 my-1 h-px bg-border',
        item: 'group relative w-full flex items-start select-none outline-none before:absolute before:z-[-1] before:inset-px before:rounded-lg data-disabled:cursor-not-allowed data-disabled:opacity-75',
        itemLeadingIcon: 'shrink-0 flex items-center justify-center text-muted',
        itemLeadingAvatar: 'shrink-0',
        itemLeadingAvatarSize: '',
        itemWrapper: 'flex-1 flex flex-col text-start min-w-0',
        itemLabel: 'truncate text-sm font-medium text-toned',
        itemDescription: 'truncate text-xs text-muted',
        itemLabelExternalIcon: 'inline-block size-3 align-top text-dimmed',
      },
      variants: {
        active: {
          true: {
            item: 'text-highlighted before:bg-accented',
            itemLeadingIcon: 'text-primary',
          },
          false: {
            item: [
              'text-toned data-highlighted:not-data-disabled:text-highlighted',
              'data-highlighted:not-data-disabled:before:bg-accented',
              'transition-colors before:transition-colors',
            ],
            itemLeadingIcon: [
              'text-muted group-data-highlighted:not-group-data-disabled:text-primary',
              'transition-colors',
            ],
          },
        },
      },
    },
    table: {
      slots: {
        root: 'relative overflow-auto',
        base: 'min-w-full',
        caption: 'sr-only',
        thead: 'bg-muted border-t border-default',
        tbody:
          'isolate [&>tr]:data-[selectable=true]:hover:bg-elevated/50 [&>tr]:data-[selectable=true]:focus-visible:outline-primary',
        tfoot: 'relative',
        tr: 'hover:bg-elevated/50 transition-colors data-[expanded=true]:bg-elevated/30',
        th: 'text-xs font-medium text-muted py-3',
        td: 'py-3',
        separator: 'border-b border-default',
        empty: 'py-6 text-center text-sm text-muted',
        loading: 'py-6 text-center',
      },
      variants: {
        virtualize: {
          false: {
            base: 'overflow-clip',
            tbody: 'divide-y divide-default',
          },
        },
        pinned: {
          true: {
            th: 'sticky bg-default/75 z-1',
            td: 'sticky bg-default/75 z-1',
          },
        },
        sticky: {
          true: {
            thead: 'sticky top-0 inset-x-0 bg-default/75 backdrop-blur z-1',
            tfoot: 'sticky bottom-0 inset-x-0 bg-default/75 backdrop-blur z-1',
          },
          header: { thead: 'sticky top-0 inset-x-0 bg-default/75 backdrop-blur z-1' },
          footer: { tfoot: 'sticky bottom-0 inset-x-0 bg-default/75 backdrop-blur z-1' },
        },
        loading: { true: { thead: 'after:absolute after:z-1 after:h-px' } },
        loadingAnimation: {
          carousel: '',
          'carousel-inverse': '',
          swing: '',
          elastic: '',
        },
        loadingColor: {
          primary: '',
          secondary: '',
          success: '',
          info: '',
          warning: '',
          error: '',
          neutral: '',
        },
      },
      compoundVariants: [
        {
          loading: true,
          loadingColor: 'primary',
          class: { thead: 'after:bg-primary' },
        },
        {
          loading: true,
          loadingColor: 'neutral',
          class: { thead: 'after:bg-inverted' },
        },
        {
          loading: true,
          loadingAnimation: 'carousel',
          class: {
            thead:
              'after:animate-[carousel_2s_ease-in-out_infinite] rtl:after:animate-[carousel-rtl_2s_ease-in-out_infinite]',
          },
        },
        {
          loading: true,
          loadingAnimation: 'carousel-inverse',
          class: {
            thead:
              'after:animate-[carousel-inverse_2s_ease-in-out_infinite] rtl:after:animate-[carousel-inverse-rtl_2s_ease-in-out_infinite]',
          },
        },
        {
          loading: true,
          loadingAnimation: 'swing',
          class: { thead: 'after:animate-[swing_2s_ease-in-out_infinite]' },
        },
        {
          loading: true,
          loadingAnimation: 'elastic',
          class: { thead: 'after:animate-[elastic_2s_ease-in-out_infinite]' },
        },
      ],
      defaultVariants: {
        loadingColor: 'primary',
        loadingAnimation: 'carousel',
      },
    },
    tooltip: {
      slots: { content: 'bg-inverted text-inverted rounded-lg p-2' },
      arrow: 'fill-inverted',
    },
    sidebar: {
      compoundVariants: [
        {
          side: 'right',
          class: { root: 'border-s-0 border-e border-default', container: 'border-s-0 border-e border-default' },
        },
      ],
    },
  },
}

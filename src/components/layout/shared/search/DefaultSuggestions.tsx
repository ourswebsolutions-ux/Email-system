import Link from 'next/link'
import { useParams } from 'next/navigation'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { Locale } from '@configs/i18n'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Type for suggestions
type DefaultSuggestionsType = {
  sectionLabel: string
  items: {
    label: string
    href: string
    icon?: string
  }[]
}

// Default suggestions data
const defaultSuggestions: DefaultSuggestionsType[] = [
  {
    sectionLabel: 'Popular Searches',
    items: [
      {
        label: 'Dashboard',
        href: '/en/apps/ecommerce/dashboard',
        icon: 'tabler-layout-dashboard'
      }
    ]
  },
  {
    sectionLabel: 'Email',
    items: [
      { label: 'Email', href: '/en/apps/email', icon: 'tabler-mail' },
      { label: 'List', href: '/en/email/list', icon: 'tabler-list' },
      { label: 'Add', href: '/en/email/form', icon: 'tabler-plus' }
    ]
  },
  {
    sectionLabel: 'User Add',
    items: [
      { label: 'List', href: '/en/user/list', icon: 'tabler-file-invoice' },
      { label: 'Add User', href: '/en/user/form', icon: 'tabler-user-plus' }
    ]
  },
  {
    sectionLabel: 'Roles & Permissions',
    items: [
      { label: 'Roles', href: '/en/apps/roles', icon: 'tabler-lock' }
    ]
  }
]

// Component
const DefaultSuggestions = ({ setOpen }: { setOpen: (value: boolean) => void }) => {
  const { lang: locale } = useParams()

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 overflow-y-auto'>
      {defaultSuggestions.map((section, index) => (
        <div
          key={index}
          className=' rounded-xl p-4 flex flex-col gap-3 '
        >
          <p className='text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wide'>
            {section.sectionLabel}
          </p>
          <ul className='flex flex-col gap-2 list-none'>
            {section.items.map((item, i) => (
              <li key={i}>
                <Link
                  href={getLocalizedUrl(item.href, locale as Locale)}
                  className='flex items-center gap-2 text-gray-200 hover:text-primary transition-colors truncate'
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <i className={classnames(item.icon, 'text-lg flex-shrink-0')} />}
                  <span className='truncate'>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default DefaultSuggestions

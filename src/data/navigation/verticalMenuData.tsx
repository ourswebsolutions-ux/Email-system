import type { VerticalMenuDataType } from '@/types/menuTypes'
import type { getDictionary } from '@/utils/getDictionary'

const verticalMenuData = (dictionary: Awaited<ReturnType<typeof getDictionary>>): VerticalMenuDataType[] => [
  // This is how you will normally render submenu
  {
    label: dictionary['navigation'].dashboards,
    suffix: {
      label: '5',
      color: 'error'
    },
    href: '/dashboards/crm',
    permission: 'view:dashboard',
    icon: 'tabler-smart-home'
  },

  // {
  //   label: dictionary['navigation'].chat,
  //   suffix: {
  //     label: '0',
  //     color: 'info'
  //   },
  //   href: '/apps/chat',
  //   permission: 'view:dashboard',
  //   icon: 'tabler-message'
  // },
  // {
  //   label: dictionary['navigation'].Gallery,
  //   suffix: {
  //     label: '0',
  //     color: 'success'
  //   },
  //   href: '/apps/gallery',
  //   permission: 'view:dashboard',
  //   icon: 'tabler-photo'
  // },

  // {
  //   label: dictionary['navigation'].editor,
  //   suffix: {
  //     label: '0',
  //     color: 'warning'
  //   },
  //   href: '/apps/editor',
  //   permission: 'view:dashboard',
  //   icon: 'tabler-edit'
  // },

  {
    label: dictionary['navigation'].appsPages,
    isSection: true,
    children: [

      {
        label: dictionary['navigation'].email,
        icon: 'tabler-user',
        children: [
          {
            label: dictionary['navigation'].email,
            icon: 'tabler-circle',
            href: '/apps/email',
            permission: 'read:email'
          },
          {
            label: dictionary['navigation'].list,
            icon: 'tabler-circle',
            href: '/email/list',
            permission: 'read:email'
          },
          {
            label: dictionary['navigation'].add,
            icon: 'tabler-circle',
            href: '/email/form',
            permission: 'create:email'
          },

        ]
      },

      // {
      //   label: dictionary['navigation'].customers,
      //   icon: 'tabler-alien',
      //   children: [
      //     {
      //       label: dictionary['navigation'].list,
      //       icon: 'tabler-circle',
      //       href: '/customers/list',
      //       permission: 'read:customer'
      //     },
      //     {
      //       label: `${dictionary['navigation'].add}  ${dictionary['navigation'].customers}`,
      //       icon: 'tabler-plus',
      //       href: '/customers/form',
      //       permission: 'create:customer'
      //     }
      //   ]
      // },

      //  {
      //   label: dictionary['navigation'].customers,
      //   icon: 'tabler-alien',
      //   children: [
          
      //     {
      //       label: `${dictionary['navigation'].add}  ${dictionary['navigation'].customers}`,
      //       icon: 'tabler-plus',
      //       href: '/customers/form',
      //       permission: 'create:customer'
      //     }
      //   ]
      // },


      {
        label: dictionary['navigation'].user,
        icon: 'tabler-user',
        children: [
          {
            label: dictionary['navigation'].list,
            icon: 'tabler-circle',
            href: '/user/list',
            permission: 'read:user'
          },
          {
            label: `${dictionary['navigation'].add}  ${dictionary['navigation'].user}`,
            icon: 'tabler-plus',
            href: '/user/form',
            permission: 'create:user'
          },
        ]
      },





      // {
      //   label: dictionary['navigation'].companies,
      //   icon: 'tabler-buildings',
      //   children: [
      //     {
      //       label: dictionary['navigation'].list,
      //       icon: 'tabler-circle',
      //       href: '/companies/list',
      //       permission: 'read:company'
      //     },
      //     {
      //       label: `${dictionary['navigation'].add}  ${dictionary['navigation'].companies}`,
      //       icon: 'tabler-plus',
      //       href: '/companies/form',
      //       permission: 'create:company'
      //     },
      //     {
      //       label: dictionary['navigation'].types,
      //       icon: 'tabler-circle-dashed-letter-t',
      //       children: [
      //         {
      //           label: dictionary['navigation'].list,
      //           icon: 'tabler-circle',
      //           href: '/companiesTypes/list',
      //           permission: 'read:companyType'
      //         },
      //         {
      //           label: `${dictionary['navigation'].add}  ${dictionary['navigation'].companies} ${dictionary['navigation'].types}`,
      //           icon: 'tabler-plus',
      //           href: '/companiesTypes/form',
      //           permission: 'create:companyType'
      //         },
      //       ]
      //     },
      //   ]
      // },
      {
        label: dictionary['navigation'].rolesPermissions,
        icon: 'tabler-lock',
        children: [
          {
            label: dictionary['navigation'].roles,
            icon: 'tabler-circle',
            href: '/apps/roles',
            permission: 'read:role'
          }
        ]
      }
    ]
  }
]

export default verticalMenuData

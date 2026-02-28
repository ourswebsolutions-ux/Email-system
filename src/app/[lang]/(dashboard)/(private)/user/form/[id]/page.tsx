'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Type Imports
import Grid from '@mui/material/Grid'

import type { ExtendedUser } from '@/utils/types'

// MUI Imports

// Component Imports
import UserLeftOverview from '@views/apps/user/form/user-left-overview'
import UserRight from '@views/apps/user/form/user-right'

// Lazy Loaded Tabs
const OverViewTab = dynamic(() => import('@views/apps/user/form/user-right/overview'))
const SecurityTab = dynamic(() => import('@views/apps/user/form/user-right/security'))

// Default State for User Data
const defaultUserData: ExtendedUser = {
  id: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  username: '',
    managerId: null, 
  image: '',
  emailVerified: null,
  roles: [],
  locations: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

import { showLoading, hideLoading } from '@/utils/frontend-helper'

const UserViewTab = () => {
  const { id } = useParams()
  const userId = Array.isArray(id) ? id[0] : id
  const [userData, setUserData] = useState<ExtendedUser>(defaultUserData)

  useEffect(() => {
    if (userId) {
      const fetchData = async () => {
        showLoading()

        try {
          const req = await fetch(`/api/users/?userId=${userId}`)
          const res = await req.json()

          if (req.ok && res?.data?.user) {
            setUserData({
              ...res.data.user,
              roles: res.data.user.roles?.map((role: { role: { id: string } }) => role.role.id) || [],
              locations:
                res.data.user.locations?.map((location: { location: { id: string } }) => location.location.id) || []
            })
          } else {
            console.warn('User data not found or invalid response')
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        } finally {
          hideLoading()
        }
      }

      fetchData()
    }
  }, [userId])

  // ✅ Optimize tabContentList using `useMemo`
  const tabContentList = useMemo(
    () => ({
      overview: <OverViewTab user={userData} setUserData={setUserData} />,
      security: <SecurityTab />
    }),
    [userData]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} lg={4} md={5}>
        <UserLeftOverview user={userData} />
      </Grid>
      <Grid item xs={12} lg={8} md={7}>
        <UserRight tabContentList={tabContentList} />
      </Grid>
    </Grid>
  )
}

export default UserViewTab

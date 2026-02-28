'use client'

// React Imports
import { useEffect, useState, useMemo } from 'react'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Type Imports
import Grid from '@mui/material/Grid'

import type { ExtendedUser } from '@/utils/types'
import { showLoading, hideLoading } from '@/utils/frontend-helper'

// MUI Imports

// Component Imports
import UserLeftOverview from '@views/apps/user/view/user-left-overview'
import UserRight from '@views/apps/user/view/user-right'

// Lazy Loaded Tabs
const LocationViewTab = dynamic(() => import('@/views/apps/user/view/user-right/location-overview'))

// const OverViewTab = dynamic(() => import('@views/apps/user/view/user-right/overview'))
// const SecurityTab = dynamic(() => import('@views/apps/user/form/user-right/security'))

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
              ...res.data.user
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
  useEffect(() => {
    if (userId) {
      const fetchData = async () => {
        showLoading()

        try {
          const req = await fetch(`/api/users/locations?userId=${userId}`)
          const res = await req.json()

          if (req.ok && res?.data?.user) {
            setUserData({
              ...res.data.user
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

  const tabContentList = useMemo(
    () => ({
      // overview: <OverViewTab user={userData} />
      // security: <SecurityTab />
      location: <LocationViewTab userId={userData.id} />
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

'use client'

// React Imports
import { useCallback, useRef, useState, useEffect } from 'react'
import type { MouseEvent } from 'react'

// MUI Imports
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import useMediaQuery from '@mui/material/useMediaQuery'
import Button from '@mui/material/Button'
import type { Theme } from '@mui/material/styles'

import classnames from 'classnames'

import { sendNotification } from '@/utils/frontend-helper'

// import { getAuthUser } from '@/utils/backend-helper'
// Third Party Components

// import { getAuthSession } from '@/helper'


// import { getAuthUser } from '@/utils/backend-helper'
import ScrollWrapper from '@/components/ScrollWrapper'

// Util & Helper Imports
import { showLoading, hideLoading } from '@/utils/frontend-helper'
import pusherClient from '@/libs/pusher'
import themeConfig from '@configs/themeConfig'
import { useSettings } from '@core/hooks/useSettings'
import getAvatar from '@/components/GetAvatar'
import type { NotificationsType } from '@/utils/types'

// Updated Notification type with backend fields

const NotificationDropdown = () => {
  // States
  const [open, setOpen] = useState(false)
  const [notificationsState, setNotificationsState] = useState<NotificationsType[]>([])
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [paginationTake, setPaginationTake] = useState(5)
  // const user = getAuthSession()
// 
  // alert(user?.id)
  // const userdata 
  // const userData= getAuthUser()
  // alert(userData)
  // Notification count based on unread notifications
  const notificationCount = notificationsState.filter(notification => !notification.read).length as number

  // Refs
  const anchorRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  // Hooks
  const hidden = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))
  const { settings } = useSettings()

  useEffect(() => {
    const channelName = `notification-${'cmlw3e2t3000xoja554fdxjzx'}`
    const isBoundRef = { current: false }

    const channel = pusherClient.subscribe(channelName)

    if (!isBoundRef.current) {
      channel.bind('new-notification', (data: { message: string; id?: string; url?: string; image_url?: string }) => {
        const newNotification: NotificationsType = {
          id: data.id || Date.now().toString(),
          title: data.message,
          subtitle: '',
          time: new Date().toLocaleString(),
          read: false,
          url: data.url,
          avatarImage: data.image_url
        }

        setNotificationsState(prevState => [newNotification, ...prevState])
      })

      isBoundRef.current = true
    }

    return () => {
      channel.unbind('new-notification')
      pusherClient.unsubscribe(channelName)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
  }

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen)
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const req = await fetch(`/api/notify?userId=${'cmlw3e2t3000xoja554fdxjzx'}&paginationTake=${paginationTake}`)

      if (req.ok) {
        const res = await req.json()

        if (res.status === 404) {
          return
        }

        setTotalNotifications(res.data.totalNotifications)

        const transformedNotifications = res.data.notifications.map((notification: any) => ({
          id: notification.id,
          title: notification.message || 'Notification',
          subtitle: notification.subtitle || '',
          time: notification.createdAt
            ? new Date(notification.createdAt).toLocaleString()
            : new Date().toLocaleString(),
          read: notification.is_read || false,
          url: notification.url,
          avatarImage: notification.image_url,
          avatarColor: !notification.image_url ? 'secondary' : undefined
        }))

        setNotificationsState(prevState => {
          const newNotifications = transformedNotifications.filter(
            (notification: any) => !prevState.some(existing => existing.id === notification.id)
          )

          return [...prevState, ...newNotifications]
        })
      }
    } catch (error) {
      console.error(error)
    }
  }, [paginationTake])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleReadNotification = async (event: MouseEvent<HTMLElement>, value: boolean, index: number) => {
    event.stopPropagation()
    const newNotifications = [...notificationsState]

    newNotifications[index].read = value
    setNotificationsState(newNotifications)

    try {
      const response = await fetch(`/api/notify?notifyId=${notificationsState[index].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: value })
      })

      if (!response.ok) {
        console.error('Failed to update the read status for this notification')
      }
    } catch (error) {
      console.error('Error updating notification:', error)
    }
  }

  const readAllNotifications = async () => {
    const newNotifications = notificationsState.map(notification => ({
      ...notification,
      read: true
    }))

    setNotificationsState(newNotifications)

    try {
      const response = await fetch(`/api/notify?userId=${'cmlw3e2t3000xoja554fdxjzx'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })

      if (!response.ok) {
        console.error('Failed to update read status for all notifications')
      }
    } catch (error) {
      console.error('Error updating all notifications:', error)
    }
  }

  const handleDelete = async (event: MouseEvent<HTMLElement>, id: string) => {
    showLoading()
    event.stopPropagation()

    try {
      const req = await fetch(`/api/notify?notifyId=${id}`, {
        method: 'DELETE'
      })

      if (req.ok) {
        setNotificationsState(prev => prev.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    } finally {
      hideLoading()
    }
  }

  useEffect(() => {
    const adjustPopoverHeight = () => {
      if (ref.current) {
        const availableHeight = window.innerHeight - 100

        ref.current.style.height = `${Math.min(availableHeight, 550)}px`
      }
    }

    window.addEventListener('resize', adjustPopoverHeight)

    return () => {
      window.removeEventListener('resize', adjustPopoverHeight)
    }
  }, [])

  return (
    <>
      <IconButton ref={anchorRef} onClick={handleToggle} className='text-textPrimary'>
        <Badge
          color='error'
          className='cursor-pointer'
          variant='dot'
          overlap='circular'
          onClick={() => setPaginationTake(5)}
          invisible={notificationCount === 0}
          sx={{
            '& .MuiBadge-dot': {
              top: 6,
              right: 5,
              boxShadow: 'var(--mui-palette-background-paper) 0px 0px 0px 2px'
            }
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <i className='tabler-bell' />
        </Badge>
      </IconButton>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        ref={ref}
        anchorEl={anchorRef.current}
        {...(isSmallScreen
          ? {
            className: 'is-full !mbs-3 z-[1] max-bs-[550px] bs-[550px]',
            modifiers: [
              {
                name: 'preventOverflow',
                options: {
                  padding: themeConfig.layoutPadding
                }
              }
            ]
          }
          : { className: 'is-96 !mbs-3 z-[1] max-bs-[550px] bs-[550px]' })}
      >
        {({ TransitionProps, placement }) => (
          <Fade {...TransitionProps} style={{ transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top' }}>
            <Paper className={classnames('bs-full', settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg')}>
              <ClickAwayListener onClickAway={handleClose}>
                <div className='bs-full flex flex-col'>
                  <div className='flex items-center justify-between plb-3.5 pli-4 is-full gap-2'>
                    <Typography variant='h6' className='flex-auto'>
                      Notifications
                    </Typography>
                    {notificationCount > 0 && (
                      <Chip size='small' variant='tonal' color='primary' label={`${notificationCount} New`} />
                    )}
                    <Tooltip
                      title={'Mark all as read'}
                      placement={placement === 'bottom-end' ? 'left' : 'right'}
                      slotProps={{
                        popper: {
                          sx: {
                            '& .MuiTooltip-tooltip': {
                              transformOrigin:
                                placement === 'bottom-end' ? 'right center !important' : 'right center !important'
                            }
                          }
                        }
                      }}
                    >
                      {notificationCount > 0 ? (
                        <IconButton size='small' onClick={readAllNotifications} className='text-textPrimary'>
                          <i className='tabler-mail-opened' />
                        </IconButton>
                      ) : (
                        <span /> // ya null
                      )}
                    </Tooltip>
                  </div>
                  <Divider />
                  <ScrollWrapper hidden={hidden}>
                    {notificationsState.length > 0 ? (
                      notificationsState.map((notification, index) => {
                        const {
                          id,
                          title,
                          subtitle,
                          time,
                          read,
                          avatarImage,
                          avatarIcon,
                          avatarText,
                          avatarColor,
                          avatarSkin,
                          url
                        } = notification

                        return (
                          <div
                            key={id}
                            className={classnames('flex plb-3 pli-4 gap-3 cursor-pointer hover:bg-actionHover group', {
                              'border-be': index !== notificationsState.length - 1
                            })}
                            onClick={e => {
                              handleReadNotification(e, true, index)

                              if (url) {
                                window.location.href = url
                              }
                            }}
                          >
                            {getAvatar({ avatarImage, avatarIcon, title, avatarText, avatarColor, avatarSkin })}
                            <div className='flex flex-col flex-auto'>
                              <Typography variant='body2' className='font-medium mbe-1' color='text.primary'>
                                {title}
                              </Typography>
                              <Typography variant='caption' color='text.secondary' className='mbe-2'>
                                {subtitle}
                              </Typography>
                              <Typography variant='caption' color='text.disabled'>
                                {time}
                              </Typography>
                            </div>
                            <div className='flex flex-col items-end gap-2'>
                              <Badge
                                variant='dot'
                                color={read ? 'secondary' : 'primary'}
                                onClick={e => handleReadNotification(e, !read, index)}
                                className={classnames('mbs-1 mie-1', {
                                  'invisible group-hover:visible': read
                                })}
                              />
                              <i
                                className='tabler-x text-xl invisible group-hover:visible'
                                onClick={e => handleDelete(e, id)}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <Typography variant='body2' className='p-4 text-center'>
                        No notifications found
                      </Typography>
                    )}
                  </ScrollWrapper>
                  <Divider />
                  <div className='p-4'>
                    {notificationsState.length < totalNotifications && (
                      <Button
                        fullWidth
                        variant='contained'
                        size='small'
                        onClick={() => {
                          setPaginationTake(prevCount => prevCount + 5)
                        }}
                      >
                        See Previous Notification
                      </Button>
                    )}
                    <Button
                      variant='contained'
                      className='mt-6'
                      color='primary'
                      onClick={() =>
                        sendNotification(
                          'Hey there!Are you ready to begin this amazing journey? 🚀',
                          false,
                          '/user/list'
                        )
                      }
                    >
                      Send Test Notification
                    </Button>
                  </div>
                </div>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default NotificationDropdown

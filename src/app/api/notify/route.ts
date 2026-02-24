import type { NextRequest } from 'next/server'

import { ZodError } from 'zod'

import pusher from '@/libs/pusher-backened'

import { apiResponse, catchErrors } from '@/utils/backend-helper'
import prisma from '@/db'




export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const take = parseInt(req.nextUrl.searchParams.get('paginationTake') || '5', 10)

    if (!userId) return catchErrors(new Error('userId required'), 'userId is required', 400)

    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      take,
      orderBy: { createdAt: 'desc' }
    })

    const totalNotifications = await prisma.notifications.count({ where: { user_id: userId } })

    return apiResponse({ notifications, totalNotifications }, 'Notifications fetched successfully')
  } catch (error) {
    return catchErrors(error as Error, 'Failed to fetch notifications')
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, url } = body

    if (!message) {
      return catchErrors(new Error('Missing required fields'), 'message is required', 400)
    }

    const superAdmins = await prisma.userRole.findMany({
      where: {
        role: {
          name: 'super-admin'
        }
      }
    })

    if (!superAdmins || superAdmins.length === 0) {
      return catchErrors(new Error('No super-admin users found'), 'No super-admin users found', 404)
    }

    for (const userRole of superAdmins) {
      const userId = userRole.userId

      const notification = await prisma.notifications.create({
        data: {
          user_id: userId,
          message: `${message}${Math.random()}`,
          url: url,
          image_url: '/images/avatars/1.png'
        }
      })

      await pusher.trigger(`notification-${userId}`, 'new-notification', {
        message,
        id: notification.id,
        url: url,
        image_url: notification.image_url
      })
    }

    return apiResponse(
      { count: superAdmins.length },
      'Notifications sent and stored successfully for all super-admin users'
    )
  } catch (error) {
    console.error(error)

    if (error instanceof ZodError) {
      return catchErrors(error, 'Invalid data', 400)
    }

    return catchErrors(error as Error, 'Failed to send notification')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const notifyId = params.get('notifyId')

    if (!notifyId) throw new Error('Notification id is required')

    const notification = await prisma.notifications.findUnique({
      where: { id: notifyId },
      select: { id: true, user_id: true }
    })

    if (!notification) throw new Error('Notification not found')

    const deletedNotification = await prisma.notifications.delete({
      where: { id: notifyId }
    })

    await pusher.trigger(`user-${notification.user_id}`, 'notification-delete', {
      id: notifyId
    })

    return apiResponse({ deletedNotification }, 'Notification deleted successfully')
  } catch (error) {
    console.error(error)

    if (error instanceof ZodError) {
      return catchErrors(error, 'Invalid data', 400)
    }

    return catchErrors(error as Error, (error as Error).message || 'Failed to delete notification')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { read } = body

    const params = req.nextUrl.searchParams
    const notifyId = params.get('notifyId')
    const userId = params.get('userId')

    let result

    if (notifyId) {
      result = await prisma.notifications.update({
        where: { id: notifyId },
        data: { is_read: read }
      })
    } else if (userId) {
      result = await prisma.notifications.updateMany({
        where: { user_id: userId },
        data: { is_read: read }
      })
    } else {
      return catchErrors(new Error('Missing notifyId or userId'), 'Either notifyId or userId is required', 400)
    }

    return apiResponse({ result }, 'Read status updated successfully')
  } catch (error) {
    console.error(error)

    return catchErrors(error as Error, 'Failed to update read status')
  }
}

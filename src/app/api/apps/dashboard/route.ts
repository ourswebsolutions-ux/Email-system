import { NextResponse } from 'next/server'

import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function GET() {
  const authUser = await getAuthUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        roles: { include: { role: true } }
      }
    })

    const isAdmin = userWithRoles?.roles.some(
      r => r.role.name === 'admin' || r.role.name === 'super-admin'
    )

    // Common filter: only emails with at least one assignment
    const baseWhere = {
      deletedAt: false,
      assignments: { some: {} }   // ← key change: must have ≥1 assignment
    }

    if (isAdmin) {
      const [
        totalUsers,
        totalEmails,
        totalAssignments,
        latestEmails,
        latestNotifications
      ] = await Promise.all([
        prisma.user.count(),
        prisma.email.count({ where: baseWhere }),
        prisma.userEmailAssignment.count(),
        prisma.email.findMany({
          where: baseWhere,
          take: 100,
          orderBy: { createdAt: 'desc' },
          include: {
            assignments: {
              include: {
                user: { select: { first_name: true, last_name: true, email: true } }
              }
            }
          }
        }),
        prisma.notifications.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ])

      return NextResponse.json({
        stats: { totalUsers, totalEmails, totalAssignments },
        latestEmails,
        latestNotifications
      })
    }

    // Normal user
    const [
      myAssignedCount,
      myEmails,
      myNotifications
    ] = await Promise.all([
      prisma.userEmailAssignment.count({ where: { userId: authUser.id } }),
      prisma.email.findMany({
        where: {
          ...baseWhere,
          assignments: { some: { userId: authUser.id } }
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: { userId: authUser.id },
            include: {
              user: { select: { first_name: true, last_name: true, email: true } }
            }
          }
        }
      }),
      prisma.notifications.findMany({
        where: { user_id: authUser.id },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ])

    return NextResponse.json({
      stats: { myAssignedEmails: myAssignedCount },
      latestEmails: myEmails,
      latestNotifications: myNotifications
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    
return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}

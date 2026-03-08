// app/api/apps/emails/get/route.ts
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/utils/backend-helper'
import prisma from '@/db'

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isSuperAdmin = user.email === 'superadmin@gmail.com'

    const { searchParams } = new URL(request.url)

    const folder = searchParams.get('folder') || 'inbox'
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = 20

    const to = searchParams.get('to') || ''
    const from = searchParams.get('from') || ''
    const subject = searchParams.get('subject') || ''

    // 🔹 Base where: folder + not deleted + at least one non-null field
    let where: any = {
      folder,
      deletedAt: false,
      OR: [
        { subject: { not: null } },
        { body: { not: null } },
        { htmlBody: { not: null } },
        { fromName: { not: null } },
        { fromEmail: { not: null } }
      ]
    }

    
    // 🔹 Normal users: restrict to assigned emails
    if (!isSuperAdmin) {
      const assigned = await prisma.userEmailAssignment.findMany({
        where: { userId: user.id },
        select: { email: true, isRead: true }
      })

      const assignedEmails = assigned.map(a => a.email).filter(Boolean)

      if (assignedEmails.length === 0) {
    
        return NextResponse.json({ emails: [], total: 0, page, pages: 0 })
      }

      where = {
        AND: [
          where,
          {
            OR: [
              { to: { in: assignedEmails } },
              { fromEmail: { in: assignedEmails } }
            ]
          }
        ]
      }
    }

    // 🔹 Apply 'to' filter only if provided
    if (to) {
      const toValue = to.trim().toLowerCase()
      where = {
        AND: [
          where,
          {
            OR: [
              { to: { startsWith: toValue } }, // partial match
              { to: toValue }                  // exact match
            ]
          }
        ]
      }
    }

    // 🔹 Apply 'from' filter only if provided
    if (from) {
      where = {
        AND: [
          where,
          { fromEmail: { contains: from, mode: 'insensitive' } }
        ]
      }
    }

    // 🔹 Apply 'subject' filter only if provided
    if (subject) {
      where = {
        AND: [
          where,
          { subject: { contains: subject, mode: 'insensitive' } }
        ]
      }
    }

    console.log('Final Prisma where filter:', JSON.stringify(where, null, 2))

    // 🔹 Fetch emails + total count
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { attachments: true }
      }),
      prisma.email.count({ where })
    ])



    // 🔹 Override isRead for assigned users
    let userAssignments: Record<string, { isRead: boolean }> = {}
    if (!isSuperAdmin) {
      const assigned = await prisma.userEmailAssignment.findMany({
        where: { userId: user.id },
        select: { email: true, isRead: true }
      })

      userAssignments = Object.fromEntries(
        assigned.map(a => [a.email!, { isRead: a.isRead }])
      )
    }

    const finalEmails = emails.map(email => {
      if (isSuperAdmin) return email

      const assignedKey =
        userAssignments[email.to ?? ''] ||
        userAssignments[email.fromEmail ?? '']

      return assignedKey ? { ...email, isRead: assignedKey.isRead } : email
    })

    return NextResponse.json({
      emails: finalEmails,
      total,
      page,
      pages: Math.ceil(total / perPage)
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

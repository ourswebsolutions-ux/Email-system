// app/api/emails/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isSuperAdmin = user.email === 'superadmin@gmail.com'

    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'inbox'
    const search = searchParams.get('search') || ''
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = 20

    let where: any = { folder, deletedAt: false, subject: null }

    // ── Non-admin: only assigned emails ─────────────
    let userAssignments: Record<string, { isRead: boolean }> = {}
    if (!isSuperAdmin) {
      const assigned = await prisma.userEmailAssignment.findMany({
        where: { userId: user.id },
        select: { email: true, isRead: true, emailId: true }
      })

      const assignedEmails = assigned.map(a => a.email).filter(Boolean)
      if (assignedEmails.length === 0) {
        return NextResponse.json({ emails: [], total: 0, page, pages: 0 })
      }

      // assigned filter
      where.AND = [
        where,
        {
          OR: [
            { to: { in: assignedEmails } },
            { fromEmail: { in: assignedEmails } }
          ]
        }
      ]

      // map assignments for lookup
      userAssignments = Object.fromEntries(
        assigned.map(a => [a.email!, { isRead: a.isRead }])
      )
    }

    // ── Search filter ───────────────────────────────
    if (search) {
      const searchFilter = {
        OR: [
          { subject: { contains: search } },
          { fromEmail: { contains: search } },
          { fromName: { contains: search } }
        ]
      }
      where.AND = where.AND ? [...where.AND, searchFilter] : [where, searchFilter]
    }

    // ── Fetch emails ───────────────────────────────
    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: { attachments: true, assignments: true },
        orderBy: [
          { assignments: { _count: 'desc' } }, // assigned emails top
          { date: 'desc' },                     // latest first
          { createdAt: 'desc' }                 // fallback
        ],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      prisma.email.count({ where })
    ])

    // ── Apply user isRead for assigned emails ──
    const finalEmails = emails.map(email => {
      if (!isSuperAdmin) {
        const assignedKey = userAssignments[email.to!] || userAssignments[email.fromEmail!]
        if (assignedKey) return { ...email, isRead: assignedKey.isRead }
      }
      return email
    })

    return NextResponse.json({
      emails: finalEmails,
      total,
      page,
      pages: Math.ceil(total / perPage)
    })

  } catch (err) {
    console.error('Email API error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// lib/fetchEmails.ts
import prisma from '@/db'

export interface EmailTableRow {
    id: string
    subject: string
    email: string
    firstName: string
    lastName: string
    assignedTo: string
    assignedUserIds: string[]
    folder: string
    date: string
}

export interface EmailsResponse {
    emails: EmailTableRow[]
    totalRecords: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
}

async function isSuperAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: String(userId) },
        select: { roles: { select: { role: { select: { name: true } } } } }
    })


    return user?.roles.some(r => r.role.name.toLowerCase() === 'super-admin') ?? false
}

export default async function fetchEmails(
    userId: string,
    page: number = 1,
    pageSize: number = 20
): Promise<EmailsResponse> {
    if (!userId) throw new Error('userId is required')

    const pageNumber = Number(page) || 1
    const size = Number(pageSize) || 20

    const superAdmin = await isSuperAdmin(userId)

    const whereFilter: any = { deletedAt: false }

    if (!superAdmin) {
        whereFilter.assignments = { some: { userId: String(userId) } }
    }

    const totalRecords = await prisma.email.count({ where: whereFilter })
    const totalPages = Math.ceil(totalRecords / size)
    const hasNextPage = pageNumber < totalPages
    const hasPrevPage = pageNumber > 1

    const emails = await prisma.email.findMany({
        skip: (pageNumber - 1) * size,
        take: size,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        where: whereFilter,
        select: {
            id: true,
            subject: true,
            to: true,
            folder: true,
            date: true,
            createdAt: true,
            user: { select: { first_name: true, last_name: true } },
            assignments: {
                select: { user: { select: { id: true, first_name: true, last_name: true } } }
            }
        }
    })

    // Remove duplicates by email (to), keep most recent
    const uniqueMap = new Map<string, typeof emails[0]>()

    for (const email of emails) {
        const key = (email.to || '').trim().toLowerCase()

        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, email)
        }
    }

    const uniqueEmails = Array.from(uniqueMap.values())

    const formattedEmails: EmailTableRow[] = uniqueEmails.map(email => {
        const assignedUsers = email.assignments
            .map(a => a.user)
            .map(u => (u.first_name ? `${u.first_name} ${u.last_name}` : '-'))
            .join(', ') || '-'

        const assignedUserIds = email.assignments.map(a => String(a.user.id))

        return {
            id: email.id,
            subject: email.subject || '(No Subject)',
            email: email.to || '-',
            firstName: email.user?.first_name || '-',
            lastName: email.user?.last_name || '-',
            assignedTo: assignedUsers,
            assignedUserIds,
            folder: email.folder,
            createdAt: email.date // ← fixed field name (was createdAt)
        }
    })

    return {
        emails: formattedEmails,
        totalRecords,
        totalPages,
        hasNextPage,
        hasPrevPage
    }
}

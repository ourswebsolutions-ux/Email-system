// app/api/user-email-assignments/remove/route.ts
import { NextResponse } from 'next/server'

import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function POST(req: Request) {
  try {
    // Authenticate user
    const adminUser = await getAuthUser()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const { email, userId } = body

    if (!email || !userId || !Array.isArray(userId) || userId.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    // Delete assignments matching email and user IDs
    const deleted = await prisma.userEmailAssignment.deleteMany({
      where: {
        email,
        userId: { in: userId }
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'No matching assignment found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deletedCount: deleted.count })
  } catch (err) {
    console.error('Failed to remove assigned user:', err)
    
return NextResponse.json({ error: 'Failed to remove assignment' }, { status: 500 })
  }
}

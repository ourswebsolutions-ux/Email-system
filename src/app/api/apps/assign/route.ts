// app/api/user-email-assignments/route.ts
import { NextResponse } from 'next/server'

import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const user = await getAuthUser()

  if (!user) 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.mailboxes || !Array.isArray(body.mailboxes) || body.mailboxes.length === 0) {
    return NextResponse.json({ error: 'No mailboxes provided' }, { status: 400 })
  }

  try {
    // Process each mailbox
    const assignments = []

    for (const mailbox of body.mailboxes) {
      if (!mailbox.email) continue

      // Check if Email record exists by unique email + userId
      let emailRecord = await prisma.email.findFirst({
        where: {
          userId: user.id,
          to: mailbox.email
        }
      })

      // If not exist, create it
      if (!emailRecord) {
        emailRecord = await prisma.email.create({
          data: {
            to: mailbox.email,
            userId: user.id,
            uid: Math.floor(Math.random() * 1000000000) * -1
          }
        })
      }

      assignments.push({
        userId: mailbox.userId,
        emailId: emailRecord.id,
        email: mailbox.email,
        uid: Math.floor(Math.random() * 1000000000) * -1,
        isRead: true
      })
    }

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'No valid email addresses found' }, { status: 400 })
    }

    await prisma.userEmailAssignment.createMany({
      data: assignments,
      skipDuplicates: true
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to assign emails:', err)
    
return NextResponse.json({ error: 'Failed to assign' }, { status: 500 })
  }
}

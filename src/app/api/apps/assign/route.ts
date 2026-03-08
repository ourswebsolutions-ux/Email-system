import { NextResponse } from 'next/server'
import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function POST(req: Request) {

  const user = await getAuthUser()

  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.mailboxes || !Array.isArray(body.mailboxes)) {
    return NextResponse.json({ error: 'No mailboxes provided' }, { status: 400 })
  }

  try {

    const assignments = []

    for (const mailbox of body.mailboxes) {

      if (!mailbox.email || !mailbox.userId) continue

      let emailRecord = await prisma.email.findFirst({
        where: {
          to: mailbox.email,
          htmlBody: null
        }
      })

      if (!emailRecord) {

        emailRecord = await prisma.email.create({
          data: {
            to: mailbox.email,
            userId: user.id,
            uid: Math.floor(Math.random() * 1_000_000_000) * -1
          }
        })

      } else {

        await prisma.email.update({
          where: { id: emailRecord.id },
          data: { createdAt: new Date() }
        })

      }

      assignments.push({
        userId: mailbox.userId,
        emailId: emailRecord.id,
        email: mailbox.email,
        uid: Math.floor(Math.random() * 1_000_000_000) * -1,
        isRead: true
      })

    }

    if (assignments.length === 0) {
      return NextResponse.json({ error: 'No valid emails' }, { status: 400 })
    }

    await prisma.userEmailAssignment.createMany({
      data: assignments,
      skipDuplicates: true
    })

    return NextResponse.json({ success: true })

  } catch (err) {

    console.error(err)

    return NextResponse.json({ error: 'Failed to assign' }, { status: 500 })

  }

}

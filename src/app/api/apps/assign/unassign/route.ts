import { NextResponse } from 'next/server'
import prisma from '@/db'
import { getAuthUser } from '@/utils/backend-helper'

export async function POST(req: Request) {
  try {
    const adminUser = await getAuthUser()
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { email, userId } = body

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    // CASE 1: Remove assignment
    if (userId && userId.length > 0) {
      const removed = await prisma.userEmailAssignment.deleteMany({
        where: {
          email, // This works if UserEmailAssignment.email string column is used
          userId: { in: userId }
        }
      })
      return NextResponse.json({ success: true, removedAssignments: removed.count })
    }

    // CASE 2: Delete empty inbox email
    const deletedEmail = await prisma.email.deleteMany({
      where: {
        to: email,  // fromEmail agar sender email
      }
    })

    return NextResponse.json({ success: true, deletedEmptyEmails: deletedEmail.count })

  } catch (err: any) {
    console.error("Failed to remove assigned user:", err)
    return NextResponse.json({ error: err?.message || "Failed to remove assignment" }, { status: 500 })
  }
}

import type { NextResponse } from 'next/server'

import { apiResponse, catchErrors, getAuthSession } from '@/helper'

import prisma from '@/db'

export async function GET(): Promise<NextResponse> {
  try {
    const authUser = await getAuthSession()

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        
      }
    })

    return apiResponse({ user }, 'User data fetched successfully', 200)
  } catch (error) {
    console.error('Error fetching user data:', error)

    return catchErrors(error as Error)
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const userData = await req.json()
    const user = await getAuthSession()

    const userUpdate = await prisma.user.update({
      where: { id: user.id },
      data: userData
    })

    return apiResponse({ userUpdate }, 'User data updated successfully', 200)
  } catch (error) {
    console.error('Error updating user data:', error)

    return catchErrors(error as Error)
  }
}

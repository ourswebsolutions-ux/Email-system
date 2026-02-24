import type { NextRequest } from 'next/server'

import bcrypt from 'bcryptjs'

import { ZodError } from 'zod'

import prisma from '@/db'
import { apiResponse, catchErrors, getAuthUser, syncManyToMany } from '@/utils/backend-helper'
import userSchema from '@/app/validations/userSchema'
import resetPasswordSchema from '@/app/validations/resetPasswordSchema'

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const authOnlySubordinates = params.get('authUser') === 'true'
    const userSession = await getAuthUser()

    const page = parseInt(params.get('page') || '0')
    const pageSize = parseInt(params.get('pageSize') || '50')

    const withModels = {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      },
      locations: {
        include: {
          location: true
        }
      }
    }

    // Return only subordinates of logged-in user
    if (authOnlySubordinates && userSession?.id) {
      const users = await prisma.user.findMany({
        where: {
          managerId: userSession.id
        },
        include: withModels,
        skip: page * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      })

      const totalRecords = await prisma.user.count({
        where: {
          managerId: userSession.id
        }
      })

      const totalPages = Math.ceil(totalRecords / pageSize)

      return apiResponse({ users, totalRecords, page, pageSize, totalPages }, 'Subordinates fetched')
    }

    // Default: fetch all users (for superadmin)
    const users = await prisma.user.findMany({
      include: withModels,
      skip: page * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const totalRecords = await prisma.user.count()
    const totalPages = Math.ceil(totalRecords / pageSize)

    return apiResponse({ users, totalRecords, page, pageSize, totalPages }, 'Users fetched')
  } catch (error) {
    console.error(error)

    return catchErrors(error as Error, 'Error getting users')
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { first_name, last_name, email, password, role, manager_id } = data

    if (!email || !password || !role || !Array.isArray(role)) {
      return new Response(
        JSON.stringify({
          message: 'Invalid input',
          error: [
            { path: ['email'], message: 'Email is required' },
            { path: ['password'], message: 'Password is required' },
            { path: ['role'], message: 'At least one role is required' }
          ]
        }),
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        roles: {
          create: role.map((roleId: string) => ({ roleId }))
        },
        managerId: manager_id || null
      }
    })

    return apiResponse({ user }, 'User created successfully')
  } catch (error) {
    console.error(error)

    return catchErrors(error as Error, 'Error creating user')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await req.json()
    const params = req.nextUrl.searchParams
    const userId = params.get('userId') || user.id
    const changePassword = params.get('changePassword')

    if (!userId) throw new Error('Invalid data')

    if (changePassword) {
      resetPasswordSchema.parse(user)

      const { password } = user
      const hashedPassword = await bcrypt.hash(password, 10)

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword
        }
      })

      return apiResponse({ updatedUser }, 'Password updated successfully')
    }

    userSchema.parse(user)
    const { locations, roles, ...userData } = user

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email
      }
    })

    await syncManyToMany('userRole', user.id, roles, 'userId', 'roleId')
    await syncManyToMany('userLocation', user.id, locations, 'userId', 'locationId')

    return apiResponse({ updatedUser }, 'User updated successfully')
  } catch (error) {
    console.error('Error updating user:', error)

    if (error instanceof ZodError) {
      return catchErrors(error, 'Invalid data', 400)
    }

    return catchErrors(error as Error, (error as Error).message || 'Error updating user')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = req.nextUrl
    const userId = user.searchParams.get('userId') as string

    if (!userId) {
      return apiResponse({}, 'User data is required', 400)
    }

    const [userLocationCount, userRoleCount] = await Promise.all([
      prisma.userLocation.count({ where: { userId: userId } }),
      prisma.userRole.count({ where: { userId: userId } })
    ])

    if (userLocationCount) throw new Error('User is linked to location table and cannot be deleted')

    // if (userRoleCount) throw new Error('User is linked to role table and cannot be deleted')

    await prisma.user.delete({
      where: { id: userId }
    })

    return apiResponse({}, 'User deleted successfully')
  } catch (error) {
    console.error(error)

    return catchErrors(error as Error, (error as Error).message || 'Error deleting user')
  }
}

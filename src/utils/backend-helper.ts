import { NextResponse } from 'next/server'

import { getServerSession } from 'next-auth'

import { ZodError, z } from 'zod'

import type { PrismaClient } from '@prisma/client'

import NodeMailer from 'nodemailer'

import prisma from '@/db'

import pusher from '@/libs/pusher-backened'

export const runtime = 'nodejs' // Add this at the top of your file

export function catchErrors(error: ZodError | Error, message: string = 'Error helper', status = 500) {
  return NextResponse.json(
    {
      error_status: true,
      message: message,
      status: status,
      error: error instanceof ZodError ? error.errors : error.message
    },
    { status }
  )
}

export function apiResponse(data: {}, message: string = 'Success', status = 200) {
  return NextResponse.json({
    error_status: false,
    message: message,
    status: status,
    data: data
  })
}

export async function getAuthUser() {
  const userSession = await getServerSession()

  if (!userSession) {
    throw catchErrors(new Error('User not authenticated'), 'User not authenticated', 401)
  }

  const user = await prisma.user.findUnique({
    where: { email: userSession.user.email }
  })

  return user
}

export function getBasePath() {
  return process.env.NEXT_PUBLIC_APP_URL
}

export const dateValidation = (message: string) =>
  z.preprocess(
    input => {
      if (input instanceof Date) return input

      if (typeof input === 'string' || typeof input === 'number') {
        const parsedDate = new Date(input)

        return isNaN(parsedDate.getTime()) ? undefined : parsedDate
      }
    },
    z.date({ required_error: message }).refine(date => !isNaN(date.getTime()), {
      message: 'Invalid date format'
    })
  )

/**
 * Generic function to sync many-to-many relations dynamically.
 *
 * @param model - The Prisma model name as a string (e.g., 'userLocation', 'userRole', etc.).
 * @param primaryId - The primary entity ID whose relations need to be updated (e.g., user ID).
 * @param relatedIds - Array of related entity IDs to sync (e.g., location IDs, role IDs).
 * @param primaryKey - The field representing the primary entity relation (e.g., 'userId', 'productId').
 * @param relatedKey - The field representing the related entity (e.g., 'locationId', 'roleId').
 */
export async function syncManyToMany(
  model: keyof PrismaClient,
  primaryId: string,
  relatedIds: string[],
  primaryKey: string,
  relatedKey: string
) {
  if (!(prisma as any)[model]) {
    throw new Error(`Invalid model: ${String(model)}`)
  }

  await prisma.$transaction([
    // Step 1: Delete all existing relations for the primary entity
    (prisma as any)[model].deleteMany({
      where: { [primaryKey]: primaryId }
    }),

    // Step 2: Insert new relations if relatedIds is not empty
    ...(relatedIds.length > 0
      ? [
          (prisma as any)[model].createMany({
            data: relatedIds.map(id => ({
              [primaryKey]: primaryId,
              [relatedKey]: id
            }))
          })
        ]
      : [])
  ])
}

export async function sendEmail(toEmail: string, subject: string, text: string, fromEmail: string | null = null) {
  try {
    const transporter = NodeMailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SENDER_USER,
        pass: process.env.SENDER_PASSWORD
      }
    })

    const mailOptions = {
      from: fromEmail || process.env.SENDER_EMAIL,
      to: toEmail,
      subject: subject,
      text: text
    }

    await transporter.sendMail(mailOptions)
  } catch (error) {
    throw new Error('Error in sending Email')
  }
}

//send api request
export async function sendApiRequest(url: string, method: string, body: any = null) {
  try {
    const apiUrl = `${process.env.API_URL}${url}`

    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: method === 'GET' ? null : JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()

      console.error(`API Error ${response.status}:`, errorText)
      throw new Error(`API request failed with status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error in sendApiRequest:', error)
    throw new Error('Error in sending API request')
  }
}

/**
 * Trigger a Pusher event to a specific channel
 * @param channel Channel name
 * @param event Event name
 * @param data Payload to send
 */
export const sendPusherNotification = async (channel: string, event: string, data: Record<string, any>) => {
  try {
    await pusher.trigger(channel, event, data)
  } catch (error) {
    console.error('Error sending Pusher notification:', error)
    throw error
  }
}

export const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

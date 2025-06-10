import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { changePasswordSchema } from '@/lib/validations/user'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const user = await User.findOne({ email: session.user.email }).select('+password')

    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    return successResponse({ hasPassword: !!user.password })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const user = await User.findOne({ email: session.user.email }).select('+password')

    if (!user || !user.password) {
      return errorResponse(new Error('Password change not available'), 'Password change is only available for users who signed up with email and password', 400)
    }

    const body = await req.json()
    const { currentPassword, newPassword } = changePasswordSchema.parse(body)

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

    if (!isPasswordValid) {
      return errorResponse(new Error('Invalid password'), 'Current password is incorrect', 400)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return successResponse({ message: 'Password changed successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}





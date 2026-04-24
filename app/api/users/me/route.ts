import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { updateNameSchema } from '@/lib/validations/user'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const user = await User.findOne({ email: session.user.email }).select('-__v')

    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    return successResponse({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    })
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
    const user = await User.findOne({ email: session.user.email })

    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    const body = await req.json()
    const { name } = updateNameSchema.parse(body)

    user.name = name
    await user.save()

    return successResponse({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      image: user.image,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}






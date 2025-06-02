import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import Friend from '@/lib/models/Friend'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { acceptFriendRequestSchema } from '@/lib/validations/user'
import { z } from 'zod'

export async function GET(req: NextRequest) {
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

    const requests = await Friend.find({
      friendId: user._id,
      status: 'pending',
    })
      .populate('userId', 'email name image')
      .lean()

    const formattedRequests = requests.map((request: any) => ({
      id: request._id.toString(),
      user: {
        id: request.userId._id.toString(),
        name: request.userId.name,
        email: request.userId.email,
        image: request.userId.image,
      },
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    }))

    return successResponse(formattedRequests)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(req: NextRequest) {
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
    const { requestId } = acceptFriendRequestSchema.parse(body)

    const friendRequest = await Friend.findOne({
      _id: requestId,
      friendId: user._id,
      status: 'pending',
    })

    if (!friendRequest) {
      return errorResponse(new Error('Friend request not found'), 'Friend request not found', 404)
    }

    // Update the request to accepted
    friendRequest.status = 'accepted'
    await friendRequest.save()

    // Create reciprocal friend connection
    const reciprocalFriend = await Friend.findOne({
      userId: user._id,
      friendId: friendRequest.userId,
    })

    if (!reciprocalFriend) {
      await Friend.create({
        userId: user._id,
        friendId: friendRequest.userId,
        status: 'accepted',
      })
    } else {
      reciprocalFriend.status = 'accepted'
      await reciprocalFriend.save()
    }

    return successResponse({ message: 'Friend request accepted' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}





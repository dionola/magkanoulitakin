import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import Friend from '@/lib/models/Friend'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { addFriendSchema } from '@/lib/validations/friend'

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

    const friends = await Friend.find({
      userId: user._id,
      status: 'accepted',
    })
      .populate('friendId', 'email name image')
      .lean()

    const formattedFriends = friends.map((friend: any) => ({
      id: friend.friendId._id.toString(),
      name: friend.friendId.name,
      email: friend.friendId.email,
      image: friend.friendId.image,
    }))

    return successResponse(formattedFriends)
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
    const { email } = addFriendSchema.parse(body)

    // Don't allow adding yourself
    if (email.toLowerCase() === session.user.email.toLowerCase()) {
      return errorResponse(new Error('Cannot add yourself as a friend'), 'Cannot add yourself as a friend', 400)
    }

    const friendUser = await User.findOne({ email: email.toLowerCase() })
    
    if (!friendUser) {
      return errorResponse(new Error('User not found'), 'User with this email not found', 404)
    }

    // Check if friendship already exists
    const existingFriend = await Friend.findOne({
      $or: [
        { userId: user._id, friendId: friendUser._id },
        { userId: friendUser._id, friendId: user._id },
      ],
    })

    if (existingFriend) {
      if (existingFriend.status === 'accepted') {
        return errorResponse(new Error('Already friends'), 'Already friends with this user', 400)
      }
      return errorResponse(new Error('Friend request already exists'), 'Friend request already exists', 400)
    }

    // Create friend request
    const friend = await Friend.create({
      userId: user._id,
      friendId: friendUser._id,
      status: 'pending',
    })

    return successResponse(
      {
        id: friend._id.toString(),
        userId: user._id.toString(),
        friendId: friendUser._id.toString(),
        status: friend.status,
        friend: {
          id: friendUser._id.toString(),
          name: friendUser.name,
          email: friendUser.email,
          image: friendUser.image,
        },
      },
      201
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}







import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import Friend from '@/lib/models/Friend'
import { errorResponse, successResponse } from '@/lib/utils/errors'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const user = await User.findOne({ email: session.user.email })
    
    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    // Find the friend connection (check both directions)
    const friend = await Friend.findOne({
      $or: [
        { _id: id, userId: user._id },
        { _id: id, friendId: user._id },
      ],
    })

    if (!friend) {
      return errorResponse(new Error('Friend connection not found'), 'Friend connection not found', 404)
    }

    await Friend.deleteOne({ _id: id })

    // Also delete reciprocal connection if it exists
    await Friend.deleteOne({
      $or: [
        { userId: friend.friendId, friendId: friend.userId },
        { userId: friend.userId, friendId: friend.friendId },
      ],
    })

    return successResponse({ message: 'Friend removed successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}







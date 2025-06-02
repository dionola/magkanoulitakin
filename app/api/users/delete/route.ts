import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import Expense from '@/lib/models/Expense'
import Friend from '@/lib/models/Friend'
import { errorResponse, successResponse } from '@/lib/utils/errors'

export async function DELETE(req: NextRequest) {
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

    const userId = user._id

    // Delete all user expenses
    await Expense.deleteMany({ userId })

    // Delete all friend connections (both directions)
    await Friend.deleteMany({ userId })
    await Friend.deleteMany({ friendId: userId })

    // Delete user account
    await User.deleteOne({ _id: userId })

    return successResponse({ message: 'Account deleted successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}







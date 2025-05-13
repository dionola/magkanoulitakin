import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { errorResponse, successResponse } from '@/lib/utils/errors'

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




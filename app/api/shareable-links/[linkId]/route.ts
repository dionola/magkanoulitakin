import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import ShareableLink from '@/lib/models/ShareableLink'
import Expense from '@/lib/models/Expense'
import Friend from '@/lib/models/Friend'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import bcrypt from 'bcryptjs'

export async function GET(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    await connectDB()
    const link = await ShareableLink.findOne({ linkId: params.linkId, isActive: true })

    if (!link) {
      return errorResponse(new Error('Link not found'), 'Link not found', 404)
    }

    // Check if expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return errorResponse(new Error('Link expired'), 'Link expired', 410)
    }

    // Get resource
    let resource: any = null
    if (link.resourceType === 'expense') {
      resource = await Expense.findById(link.resourceId).lean()
    } else if (link.resourceType === 'recurring-expense') {
      resource = await RecurringExpense.findById(link.resourceId).lean()
    }

    if (!resource) {
      return errorResponse(new Error('Resource not found'), 'Resource not found', 404)
    }

    // Check if user is logged in and is a friend
    const session = await getServerSession(authOptions)
    let isFriend = false
    if (session?.user?.email) {
      const User = await import('@/lib/models/User').then(m => m.default)
      const user = await User.findOne({ email: session.user.email })
      if (user) {
        isFriend = link.allowedFriendIds.some(friendId => friendId.toString() === user._id.toString())
      }
    }

    // Return link info (without password) and whether password is required
    return successResponse({
      linkId: link.linkId,
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      hasPassword: !!link.password,
      requiresPassword: !!link.password && !isFriend,
      resource: {
        id: resource._id.toString(),
        name: resource.name,
        amount: resource.amount,
        ...(link.resourceType === 'expense' ? {
          date: resource.date?.toISOString().split('T')[0],
          category: resource.category,
          paidBy: resource.paidBy,
          splitWith: resource.splitWith,
        } : {
          frequency: resource.frequency,
          category: resource.category,
          dayOfMonth: resource.dayOfMonth,
          dayOfWeek: resource.dayOfWeek,
        }),
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    await connectDB()
    const body = await req.json()
    const { password } = body

    const link = await ShareableLink.findOne({ linkId: params.linkId, isActive: true })

    if (!link) {
      return errorResponse(new Error('Link not found'), 'Link not found', 404)
    }

    // Check if expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return errorResponse(new Error('Link expired'), 'Link expired', 410)
    }

    // Check if user is logged in and is a friend
    const session = await getServerSession(authOptions)
    let isFriend = false
    if (session?.user?.email) {
      const User = await import('@/lib/models/User').then(m => m.default)
      const user = await User.findOne({ email: session.user.email })
      if (user) {
        isFriend = link.allowedFriendIds.some(friendId => friendId.toString() === user._id.toString())
      }
    }

    // If friend, no password needed
    if (isFriend) {
      // Get resource
      let resource: any = null
      if (link.resourceType === 'expense') {
        resource = await Expense.findById(link.resourceId).lean()
      } else if (link.resourceType === 'recurring-expense') {
        resource = await RecurringExpense.findById(link.resourceId).lean()
      }

      if (!resource) {
        return errorResponse(new Error('Resource not found'), 'Resource not found', 404)
      }

      return successResponse({
        authenticated: true,
        resource: {
          id: resource._id.toString(),
          ...resource,
          _id: resource._id.toString(),
        },
      })
    }

    // Check password if required
    if (link.password) {
      if (!password) {
        return errorResponse(new Error('Password required'), 'Password required', 401)
      }

      const isValid = await bcrypt.compare(password, link.password)
      if (!isValid) {
        return errorResponse(new Error('Invalid password'), 'Invalid password', 401)
      }
    }

    // Get resource
    let resource: any = null
    if (link.resourceType === 'expense') {
      resource = await Expense.findById(link.resourceId).lean()
    } else if (link.resourceType === 'recurring-expense') {
      resource = await RecurringExpense.findById(link.resourceId).lean()
    }

    if (!resource) {
      return errorResponse(new Error('Resource not found'), 'Resource not found', 404)
    }

    return successResponse({
      authenticated: true,
      resource: {
        id: resource._id.toString(),
        ...resource,
        _id: resource._id.toString(),
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}





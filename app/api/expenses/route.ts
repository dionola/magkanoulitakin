import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { createExpenseSchema } from '@/lib/validations/expense'
import Friend from '@/lib/models/Friend'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return errorResponse(new Error('Unauthorized'), 'Unauthorized', 401)
    }

    await connectDB()
    const User = await import('@/lib/models/User').then(m => m.default)
    const user = await User.findOne({ email: session.user.email })
    
    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    const { searchParams } = new URL(req.url)
    const dateRange = searchParams.get('dateRange') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let dateFilter: any = {}

    if (startDate && endDate) {
      // Custom date range
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      }
    } else if (dateRange === 'thisMonth') {
      dateFilter = {
        date: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
      }
    } else if (dateRange === 'lastMonth') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const year = currentMonth === 0 ? currentYear - 1 : currentYear
      dateFilter = {
        date: {
          $gte: new Date(year, lastMonth, 1),
          $lt: new Date(year, lastMonth + 1, 1),
        },
      }
    } else if (dateRange === 'thisYear') {
      dateFilter = {
        date: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1),
        },
      }
    }

    const expenses = await Expense.find({
      userId: user._id,
      ...dateFilter,
    })
      .sort({ date: -1 })
      .lean()

    const formattedExpenses = expenses.map((expense) => ({
      id: expense._id.toString(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0],
      budget: expense.budget,
      category: expense.category,
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
      sharedExpenseId: expense.sharedExpenseId,
      transactionGroupId: expense.transactionGroupId,
      transactionGroupName: expense.transactionGroupName,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    }))

    return successResponse(formattedExpenses)
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
    const User = await import('@/lib/models/User').then(m => m.default)
    const user = await User.findOne({ email: session.user.email })
    
    if (!user) {
      return errorResponse(new Error('User not found'), 'User not found', 404)
    }

    const body = await req.json()
    const sharedParticipantIds = Array.isArray(body.sharedParticipantIds)
      ? body.sharedParticipantIds.filter((value: unknown): value is string => typeof value === 'string')
      : []
    const validatedData = createExpenseSchema.parse(body)
    const acceptedFriends = sharedParticipantIds.length > 0
      ? await Friend.find({
          userId: user._id,
          friendId: { $in: sharedParticipantIds },
          status: 'accepted',
        }).select('friendId').lean()
      : []

    const participantUserIds = Array.from(
      new Set([
        user._id.toString(),
        ...acceptedFriends.map(friend => friend.friendId.toString()),
      ])
    )

    const transactionGroupId =
      validatedData.transactionGroupId ||
      (participantUserIds.length > 1 ? crypto.randomBytes(12).toString('hex') : undefined)
    const sharedExpenseId = validatedData.sharedExpenseId || crypto.randomBytes(12).toString('hex')

    const expenses = await Expense.insertMany(
      participantUserIds.map(participantId => ({
        userId: participantId,
        name: validatedData.name,
        amount: validatedData.amount,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        budget: validatedData.budget,
        category: validatedData.category,
        paidBy: validatedData.paidBy,
        splitWith: validatedData.splitWith,
        type: validatedData.type,
        sharedExpenseId,
        transactionGroupId,
        transactionGroupName: validatedData.transactionGroupName,
      }))
    )

    // Auto-create shareable links if they don't exist
    try {
      const ShareableLink = await import('@/lib/models/ShareableLink').then(m => m.default)

      await Promise.all(
        expenses.map(async (expense) => {
          const existingLink = await ShareableLink.findOne({
            userId: expense.userId,
            resourceType: 'expense',
            resourceId: expense._id.toString(),
            isActive: true,
          })

          if (!existingLink) {
            await ShareableLink.create({
              userId: expense.userId,
              linkId: crypto.randomBytes(16).toString('hex'),
              resourceType: 'expense',
              resourceId: expense._id.toString(),
              isActive: true,
            })
          }
        })
      )
    } catch {
      // Don't fail the request if link creation fails
    }

    const expense = expenses.find(createdExpense => createdExpense.userId.toString() === user._id.toString()) || expenses[0]

    return successResponse(
      {
        id: expense._id.toString(),
        name: expense.name,
        amount: expense.amount,
        date: expense.date.toISOString().split('T')[0],
        budget: expense.budget,
        category: expense.category,
        paidBy: expense.paidBy,
        splitWith: expense.splitWith,
        type: expense.type,
        sharedExpenseId: expense.sharedExpenseId,
        transactionGroupId: expense.transactionGroupId,
        transactionGroupName: expense.transactionGroupName,
        sharedParticipantCount: participantUserIds.length,
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

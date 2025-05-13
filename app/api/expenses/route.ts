import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { createExpenseSchema } from '@/lib/validations/expense'

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
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
      transactionGroupId: expense.transactionGroupId,
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
    const validatedData = createExpenseSchema.parse(body)

    const expense = await Expense.create({
      userId: user._id,
      name: validatedData.name,
      amount: validatedData.amount,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      budget: validatedData.budget,
      paidBy: validatedData.paidBy,
      splitWith: validatedData.splitWith,
      type: validatedData.type,
      transactionGroupId: validatedData.transactionGroupId,
    })

    return successResponse(
      {
        id: expense._id.toString(),
        name: expense.name,
        amount: expense.amount,
        date: expense.date.toISOString().split('T')[0],
        budget: expense.budget,
        paidBy: expense.paidBy,
        splitWith: expense.splitWith,
        type: expense.type,
        transactionGroupId: expense.transactionGroupId,
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


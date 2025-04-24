import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import connectDB from '@/lib/db'
import Expense from '@/lib/models/Expense'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const expense = await Expense.findOne({
      _id: params.id,
      userId: user._id,
    }).lean()

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    return successResponse({
      id: expense._id.toString(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0],
      budget: expense.budget,
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const validatedData = updateExpenseSchema.parse(body)

    const expense = await Expense.findOneAndUpdate(
      {
        _id: params.id,
        userId: user._id,
      },
      {
        ...validatedData,
        ...(validatedData.date && { date: new Date(validatedData.date) }),
      },
      { new: true, runValidators: true }
    )

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    return successResponse({
      id: expense._id.toString(),
      name: expense.name,
      amount: expense.amount,
      date: expense.date.toISOString().split('T')[0],
      budget: expense.budget,
      paidBy: expense.paidBy,
      splitWith: expense.splitWith,
      type: expense.type,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const expense = await Expense.findOneAndDelete({
      _id: params.id,
      userId: user._id,
    })

    if (!expense) {
      return errorResponse(new Error('Expense not found'), 'Expense not found', 404)
    }

    return successResponse({ message: 'Expense deleted successfully' })
  } catch (error) {
    return errorResponse(error)
  }
}


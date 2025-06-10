import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'
import { errorResponse, successResponse } from '@/lib/utils/errors'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = signupSchema.parse(body)

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() })
    if (existingUser) {
      return errorResponse(new Error('User already exists'), 'User with this email already exists', 400)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await User.create({
      email: validatedData.email.toLowerCase(),
      name: validatedData.name,
      password: hashedPassword,
    })

    return successResponse(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      201
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error, 'Validation error', 400)
    }
    return errorResponse(error)
  }
}







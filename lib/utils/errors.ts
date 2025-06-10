import { NextResponse } from 'next/server'

export class ApiError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ApiError'
  }
}

export function errorResponse(error: unknown, defaultMessage: string = 'An error occurred', status?: number) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: status ?? 500 }
    )
  }

  return NextResponse.json(
    { error: defaultMessage },
    { status: status ?? 500 }
  )
}

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}







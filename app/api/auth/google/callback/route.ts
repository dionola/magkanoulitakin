import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import NextAuth from 'next-auth'

// This route handles the Google OAuth callback in the format: /api/auth/google/callback
// It redirects to NextAuth's standard callback handler
export async function GET(req: NextRequest) {
  console.log('[GoogleCallback] Google callback route called')
  
  // Extract the query parameters from the original request
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('[GoogleCallback] Query params:', { 
    hasCode: !!code, 
    hasState: !!state, 
    error 
  })

  // Redirect to NextAuth's standard callback format
  const nextAuthUrl = new URL('/api/auth/callback/google', req.nextUrl.origin)
  
  // Copy all query parameters
  if (code) nextAuthUrl.searchParams.set('code', code)
  if (state) nextAuthUrl.searchParams.set('state', state)
  if (error) nextAuthUrl.searchParams.set('error', error)
  
  // Copy any other query parameters
  searchParams.forEach((value, key) => {
    if (!['code', 'state', 'error'].includes(key)) {
      nextAuthUrl.searchParams.set(key, value)
    }
  })

  console.log('[GoogleCallback] Redirecting to:', nextAuthUrl.toString())
  return NextResponse.redirect(nextAuthUrl)
}


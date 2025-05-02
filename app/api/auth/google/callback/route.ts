import { NextRequest, NextResponse } from 'next/server'

// This route handles the Google OAuth callback in the format: /api/auth/google/callback
// It redirects to NextAuth's standard callback handler
// NextAuth will handle the OAuth flow from there
export async function GET(req: NextRequest) {
  console.log('[GoogleCallback] Google callback route called')
  console.log('[GoogleCallback] Original URL:', req.url)
  
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
  // NextAuth expects /api/auth/callback/google
  const nextAuthUrl = new URL('/api/auth/callback/google', req.nextUrl.origin)
  
  // Copy all query parameters exactly as they are
  // This preserves the state parameter which NextAuth needs for validation
  searchParams.forEach((value, key) => {
    nextAuthUrl.searchParams.set(key, value)
  })

  console.log('[GoogleCallback] Redirecting to NextAuth callback:', nextAuthUrl.toString())
  
  // Use a 307 (Temporary Redirect) to preserve the POST method if needed
  // But for OAuth callbacks, GET is standard
  return NextResponse.redirect(nextAuthUrl, { status: 307 })
}


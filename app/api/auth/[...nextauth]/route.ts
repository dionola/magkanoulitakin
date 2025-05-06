import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        await connectDB()
        const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password')

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('[JWT] JWT callback called', { 
        hasUser: !!user, 
        userEmail: user?.email, 
        userId: user?.id,
        accountProvider: account?.provider,
        tokenId: token.id 
      })
      
      // Initial sign in - user object is available
      if (user) {
        // For credentials provider, user.id is already set
        if (user.id) {
          console.log('[JWT] Credentials provider - using existing user.id:', user.id)
          token.id = user.id
          token.email = user.email
          token.name = user.name
          token.picture = user.image
        } else if (user.email) {
          // For Google OAuth, fetch user from database to get the ID
          // The user should already be created in signIn callback, but we fetch it here to ensure we have the ID
          console.log('[JWT] Google OAuth - fetching user from DB:', user.email)
          await connectDB()
          const dbUser = await User.findOne({ email: user.email })
          if (dbUser) {
            console.log('[JWT] Found user in DB:', dbUser._id.toString())
            token.id = dbUser._id.toString()
            token.email = dbUser.email
            token.name = dbUser.name
            token.picture = dbUser.image
          } else {
            console.error('[JWT] User not found in DB after Google OAuth:', user.email)
          }
        }
      }
      
      // On subsequent requests, refresh user data if needed
      if (token.id && account?.provider === 'google') {
        console.log('[JWT] Refreshing user data for token.id:', token.id)
        await connectDB()
        const dbUser = await User.findById(token.id)
        if (dbUser) {
          token.email = dbUser.email
          token.name = dbUser.name
          token.picture = dbUser.image
        }
      }
      
      console.log('[JWT] Returning token with id:', token.id)
      return token
    },
    async session({ session, token }) {
      console.log('[Session] Session callback called', { 
        tokenId: token.id, 
        tokenEmail: token.email,
        sessionUserEmail: session.user?.email 
      })
      
      if (session.user) {
        session.user.id = token.id as string
        // Ensure email and name are set from token
        if (token.email) {
          session.user.email = token.email as string
        }
        if (token.name) {
          session.user.name = token.name as string
        }
        if (token.picture) {
          session.user.image = token.picture as string
        }
        console.log('[Session] Session user set:', { 
          id: session.user.id, 
          email: session.user.email,
          name: session.user.name 
        })
      }
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('[SignIn] ==========================================')
      console.log('[SignIn] SignIn callback called', { 
        provider: account?.provider,
        userEmail: user?.email,
        userName: user?.name,
        accountType: account?.type,
        accountAccessToken: account?.access_token ? 'present' : 'missing',
        accountIdToken: account?.id_token ? 'present' : 'missing',
      })
      
      if (account?.provider === 'google') {
        try {
          console.log('[SignIn] Processing Google OAuth sign-in')
          await connectDB()
          
          if (!user.email) {
            console.error('[SignIn] Google OAuth: No email provided')
            return false
          }
          
          console.log('[SignIn] Looking up user:', user.email.toLowerCase())
          const existingUser = await User.findOne({ email: user.email.toLowerCase() })
          
          if (!existingUser) {
            // New user - create account (sign up)
            console.log('[SignIn] Creating new user account')
            const newUser = await User.create({
              email: user.email.toLowerCase(),
              name: user.name || 'User',
              image: user.image,
              emailVerified: new Date(),
            })
            console.log('[SignIn] New user created via Google OAuth:', {
              id: newUser._id.toString(),
              email: newUser.email,
              name: newUser.name
            })
          } else {
            // Existing user - update profile info
            console.log('[SignIn] Updating existing user:', existingUser._id.toString())
            await User.updateOne(
              { email: user.email.toLowerCase() },
              {
                $set: {
                  name: user.name || existingUser.name,
                  image: user.image || existingUser.image,
                  emailVerified: existingUser.emailVerified || new Date(),
                },
              }
            )
            console.log('[SignIn] User profile updated')
          }
          
          console.log('[SignIn] Google OAuth sign-in successful, returning true')
          console.log('[SignIn] ==========================================')
          return true
        } catch (error) {
          console.error('[SignIn] ==========================================')
          console.error('[SignIn] Error in signIn callback:', error)
          if (error instanceof Error) {
            console.error('[SignIn] Error message:', error.message)
            console.error('[SignIn] Error stack:', error.stack)
          }
          console.error('[SignIn] ==========================================')
          return false
        }
      }
      // For credentials provider, user is already authenticated
      console.log('[SignIn] Credentials provider, returning true')
      console.log('[SignIn] ==========================================')
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

const handler = NextAuth(authOptions)

// Wrap handler with comprehensive logging
async function loggedHandler(
  req: NextRequest, 
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const url = req.nextUrl
  const path = url.pathname
  const searchParams = Object.fromEntries(url.searchParams)
  
  // Await params as it's a Promise in Next.js 15+
  const params = await context.params
  
  console.log('[NextAuth Handler] ==========================================')
  console.log('[NextAuth Handler] Request received')
  console.log('[NextAuth Handler] Method:', req.method)
  console.log('[NextAuth Handler] Path:', path)
  console.log('[NextAuth Handler] Search params:', searchParams)
  console.log('[NextAuth Handler] NextAuth route:', params?.nextauth)
  console.log('[NextAuth Handler] Full URL:', url.toString())
  console.log('[NextAuth Handler] Cookies:', req.cookies.getAll().map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' })))
  
  try {
    const response = await handler(req, { params: Promise.resolve(params) })
    
    console.log('[NextAuth Handler] Response generated')
    console.log('[NextAuth Handler] Status:', response?.status)
    console.log('[NextAuth Handler] Response cookies:', response?.headers.get('set-cookie')?.substring(0, 100))
    console.log('[NextAuth Handler] ==========================================')
    
    return response
  } catch (error) {
    console.error('[NextAuth Handler] ERROR:', error)
    if (error instanceof Error) {
      console.error('[NextAuth Handler] Error message:', error.message)
      console.error('[NextAuth Handler] Error stack:', error.stack)
    }
    console.log('[NextAuth Handler] ==========================================')
    throw error
  }
}

export { loggedHandler as GET, loggedHandler as POST }


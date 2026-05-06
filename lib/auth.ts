import type { NextAuthOptions } from 'next-auth'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import connectDB from '@/lib/db'
import clientPromise from '@/lib/mongodb'
import User from '@/lib/models/User'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name
        if (session.user.email) token.email = session.user.email
        if (session.user.image) token.picture = session.user.image
      }

      if (user) {
        if (account?.provider === 'google') {
          await connectDB()
          const dbUser = user.email ? await User.findOne({ email: user.email.toLowerCase() }) : null
          if (dbUser) {
            token.id = dbUser._id.toString()
            token.email = dbUser.email
            token.name = dbUser.name
            token.picture = dbUser.image
          } else {
            token.id = user.id
            token.email = user.email
            token.name = user.name
            token.picture = user.image
          }
        } else if (account?.provider === 'credentials') {
          token.id = user.id
          token.email = user.email
          token.name = user.name
          token.picture = user.image
        } else if (user.email) {
          await connectDB()
          const dbUser = await User.findOne({ email: user.email })
          if (dbUser) {
            token.id = dbUser._id.toString()
            token.email = dbUser.email
            token.name = dbUser.name
            token.picture = dbUser.image
          }
        }
      }
      if (token.id && !user && /^[0-9a-fA-F]{24}$/.test(token.id)) {
        await connectDB()
        const dbUser = await User.findById(token.id)
        if (dbUser) {
          token.email = dbUser.email
          token.name = dbUser.name
          token.picture = dbUser.image
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        if (token.email) session.user.email = token.email as string
        if (token.name) session.user.name = token.name as string
        if (token.picture) session.user.image = token.picture as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await connectDB()
          if (!user.email) return false
          const existingUser = await User.findOne({ email: user.email.toLowerCase() })
          await User.updateOne(
            { email: user.email.toLowerCase() },
            {
              $set: {
                name: user.name || existingUser?.name || 'User',
                image: user.image || existingUser?.image,
                emailVerified: existingUser?.emailVerified || new Date(),
              },
            },
            { upsert: true }
          )
          return true
        } catch {
          return false
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

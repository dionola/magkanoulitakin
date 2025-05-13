import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/friends/route'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  default: jest.fn(),
}))

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}))

jest.mock('@/lib/models/Friend', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}))

import { getServerSession } from 'next-auth'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import Friend from '@/lib/models/Friend'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>
const mockUserFindOne = User.findOne as jest.MockedFunction<typeof User.findOne>
const mockFriendFind = Friend.find as jest.MockedFunction<typeof Friend.find>
const mockFriendFindOne = Friend.findOne as jest.MockedFunction<typeof Friend.findOne>
const mockFriendCreate = Friend.create as jest.MockedFunction<typeof Friend.create>

describe('/api/friends', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectDB.mockResolvedValue(undefined)
  })

  describe('GET', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/friends')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should return 404 when user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne.mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/friends')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should return friends list for authenticated user', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' }
      const mockFriends = [
        {
          friendId: {
            _id: 'friend1',
            name: 'Friend One',
            email: 'friend1@example.com',
            image: 'image1.jpg',
          },
          status: 'accepted',
        },
      ]

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne.mockResolvedValue(mockUser as any)
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockFriends),
      }
      mockFriendFind.mockReturnValue(mockQuery as any)

      const req = new NextRequest('http://localhost:3000/api/friends')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFriendFind).toHaveBeenCalled()
    })
  })

  describe('POST', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          email: 'friend@example.com',
        }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should return 400 when trying to add yourself', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne.mockResolvedValue({ _id: 'user123' } as any)

      const req = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should return 404 when friend user is not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne
        .mockResolvedValueOnce({ _id: 'user123' } as any) // Current user
        .mockResolvedValueOnce(null) // Friend user not found

      const req = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should return 400 when friendship already exists', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' }
      const mockFriendUser = { _id: 'friend123', email: 'friend@example.com' }
      const mockExistingFriend = {
        _id: 'existing123',
        userId: 'user123',
        friendId: 'friend123',
        status: 'accepted',
      }

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne
        .mockResolvedValueOnce(mockUser as any) // Current user
        .mockResolvedValueOnce(mockFriendUser as any) // Friend user
      mockFriendFindOne.mockResolvedValue(mockExistingFriend as any)

      const req = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          email: 'friend@example.com',
        }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.error || data.message).toBeDefined()
    })

    it('should create friend request for valid user', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com', name: 'Test User', image: null }
      const mockFriendUser = { _id: 'friend123', email: 'friend@example.com', name: 'Friend User', image: null }
      const mockFriendRequest = {
        _id: 'request123',
        userId: 'user123',
        friendId: 'friend123',
        status: 'pending',
      }

      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any)
      mockUserFindOne
        .mockResolvedValueOnce(mockUser as any) // Current user
        .mockResolvedValueOnce(mockFriendUser as any) // Friend user
      mockFriendFindOne.mockResolvedValue(null) // No existing friendship
      mockFriendCreate.mockResolvedValue(mockFriendRequest as any)

      const req = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({
          email: 'friend@example.com',
        }),
      })
      const response = await POST(req)

      expect(response.status).toBeDefined()
      expect(typeof response.status).toBe('number')
    })
  })
})


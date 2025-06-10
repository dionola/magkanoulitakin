import mongoose, { Schema, Model } from 'mongoose'

export interface IShareableLink extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  linkId: string // Unique identifier for the link
  resourceType: 'expense'
  resourceId: string // ID of the expense or recurring expense
  password?: string // Optional password (hashed)
  allowedFriendIds: mongoose.Types.ObjectId[] // Friends who can access without password
  isActive: boolean
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ShareableLinkSchema = new Schema<IShareableLink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    linkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['expense'],
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
    },
    password: {
      type: String, // Will be hashed
    },
    allowedFriendIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

ShareableLinkSchema.index({ linkId: 1 })
ShareableLinkSchema.index({ userId: 1, resourceType: 1, resourceId: 1 })

const ShareableLink: Model<IShareableLink> = mongoose.models.ShareableLink || mongoose.model<IShareableLink>('ShareableLink', ShareableLinkSchema)

export default ShareableLink





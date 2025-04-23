import mongoose, { Schema, Model } from 'mongoose'

export interface IFriend extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  friendId: mongoose.Types.ObjectId
  status: 'pending' | 'accepted'
  createdAt: Date
  updatedAt: Date
}

const FriendSchema = new Schema<IFriend>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
)

FriendSchema.index({ userId: 1, friendId: 1 }, { unique: true })
FriendSchema.index({ friendId: 1, status: 1 })

const Friend: Model<IFriend> = mongoose.models.Friend || mongoose.model<IFriend>('Friend', FriendSchema)

export default Friend


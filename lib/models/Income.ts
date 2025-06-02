import mongoose, { Schema, Model } from 'mongoose'

export interface IIncome extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  name: string
  amount: number
  frequency: 'one-time' | 'monthly' | 'weekly' | 'bi-weekly' | 'daily'
  dayOfMonth?: number // For monthly: 1-31
  dayOfWeek?: number // For weekly: 0-6 (Sunday-Saturday)
  specificDays?: number[] // For specific days in month: [1, 15, 30]
  startDate: Date
  endDate?: Date
  isActive: boolean
  lastProcessed?: Date
  createdAt: Date
  updatedAt: Date
}

const IncomeSchema = new Schema<IIncome>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['one-time', 'monthly', 'weekly', 'bi-weekly', 'daily'],
      required: true,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
    },
    specificDays: {
      type: [Number],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastProcessed: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

IncomeSchema.index({ userId: 1, isActive: 1 })

const Income: Model<IIncome> = mongoose.models.Income || mongoose.model<IIncome>('Income', IncomeSchema)

export default Income





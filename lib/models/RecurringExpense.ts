import mongoose, { Schema, Model } from 'mongoose'

export interface IRecurringExpense extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  name: string
  amount: number
  category?: string
  frequency: 'monthly' | 'weekly' | 'daily'
  dayOfMonth?: number // For monthly: 1-31
  dayOfWeek?: number // For weekly: 0-6 (Sunday-Saturday)
  startDate: Date
  endDate?: Date
  isActive: boolean
  lastProcessed?: Date
  createdAt: Date
  updatedAt: Date
}

const RecurringExpenseSchema = new Schema<IRecurringExpense>(
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
    category: {
      type: String,
    },
    frequency: {
      type: String,
      enum: ['monthly', 'weekly', 'daily'],
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

RecurringExpenseSchema.index({ userId: 1, isActive: 1 })

const RecurringExpense: Model<IRecurringExpense> = mongoose.models.RecurringExpense || mongoose.model<IRecurringExpense>('RecurringExpense', RecurringExpenseSchema)

export default RecurringExpense





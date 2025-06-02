import mongoose, { Schema, Model } from 'mongoose'

export interface IExpense extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  name: string
  amount: number
  date: Date
  budget?: string
  category?: string
  paidBy: string
  splitWith: string[]
  type: 'expense' | 'settlement'
  transactionGroupId?: string
  createdAt: Date
  updatedAt: Date
}

const ExpenseSchema = new Schema<IExpense>(
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
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    budget: {
      type: String,
    },
    category: {
      type: String,
    },
    paidBy: {
      type: String,
      required: true,
    },
    splitWith: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ['expense', 'settlement'],
      default: 'expense',
    },
    transactionGroupId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

ExpenseSchema.index({ userId: 1, date: -1 })

const Expense: Model<IExpense> = mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema)

export default Expense




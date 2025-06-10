import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set — run with: node --env-file=.env.local scripts/seed.mjs')
  process.exit(1)
}

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema(
  { email: String, name: String, password: String, image: String, emailVerified: Date },
  { timestamps: true }
))
const Expense = mongoose.models.Expense || mongoose.model('Expense', new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String, amount: Number, date: Date, category: String,
    paidBy: String, splitWith: [String],
    type: { type: String, default: 'expense' },
    transactionGroupId: String,
  },
  { timestamps: true }
))
const Friend = mongoose.models.Friend || mongoose.model('Friend', new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
))

function date(monthsAgo, day) {
  const d = new Date()
  d.setDate(day)
  d.setHours(10, 0, 0, 0)
  d.setMonth(d.getMonth() - monthsAgo)
  return d
}

// ── User definitions ──────────────────────────────────────────────────────────

const ACCOUNTS = [
  { email: 'test@test.com',  name: 'Alex' },
  { email: 'test1@test.com', name: 'Jordan' },
  { email: 'test2@test.com', name: 'Sam' },
  { email: 'test3@test.com', name: 'Riley' },
  { email: 'test4@test.com', name: 'Morgan' },
  { email: 'test5@test.com', name: 'Taylor' },
  { email: 'test6@test.com', name: 'Casey' },
  { email: 'test7@test.com', name: 'Drew' },
  { email: 'test8@test.com', name: 'Quinn' },
  { email: 'test9@test.com', name: 'Blake' },
]

// ── Connect ───────────────────────────────────────────────────────────────────

await mongoose.connect(MONGODB_URI, { bufferCommands: false })
console.log('Connected to MongoDB')

const hash = await bcrypt.hash('Test123!', 12)

// Upsert all users
const users = []
for (const { email, name } of ACCOUNTS) {
  let u = await User.findOne({ email })
  if (u) {
    await User.updateOne({ _id: u._id }, { name, password: hash })
    u = await User.findOne({ email })
  } else {
    u = await User.create({ email, name, password: hash })
  }
  users.push(u)
  console.log(`Upserted: ${email} (${name})`)
}

// ── Friendships: everyone friends with test@test.com + a few cross-links ─────

const friendPairs = [
  // Alex knows everyone
  ...users.slice(1).map(u => [users[0]._id, u._id]),
  // Some extra cross-friendships
  [users[1]._id, users[2]._id], // Jordan ↔ Sam
  [users[1]._id, users[3]._id], // Jordan ↔ Riley
  [users[2]._id, users[4]._id], // Sam ↔ Morgan
  [users[3]._id, users[5]._id], // Riley ↔ Taylor
  [users[5]._id, users[6]._id], // Taylor ↔ Casey
  [users[7]._id, users[8]._id], // Drew ↔ Quinn
  [users[8]._id, users[9]._id], // Quinn ↔ Blake
]

const allIds = users.map(u => u._id)
await Friend.deleteMany({ $or: [{ userId: { $in: allIds } }, { friendId: { $in: allIds } }] })

const friendDocs = []
for (const [a, b] of friendPairs) {
  friendDocs.push({ userId: a, friendId: b, status: 'accepted' })
  friendDocs.push({ userId: b, friendId: a, status: 'accepted' })
}
await Friend.insertMany(friendDocs)
console.log(`Created ${friendPairs.length} friendships`)

// ── Expenses ──────────────────────────────────────────────────────────────────

await Expense.deleteMany({ userId: { $in: allIds } })

const FOOD = 'food', UTIL = 'utilities', ENT = 'entertainment', TRANS = 'transport', HEALTH = 'health', TRAVEL = 'travel'

function makeExpenses(name, friendName) {
  return [
    // 12 months ago
    { name: 'Groceries',              amount: 1750, category: FOOD,   date: date(12, 4),  paidBy: name, splitWith: [] },
    { name: 'Electricity',            amount: 2050, category: UTIL,   date: date(12, 10), paidBy: name, splitWith: [] },
    { name: `New Year dinner`,        amount: 2200, category: FOOD,   date: date(12, 28), paidBy: name, splitWith: [friendName] },
    // 11 months ago
    { name: 'Groceries',              amount: 1850, category: FOOD,   date: date(11, 5),  paidBy: name, splitWith: [] },
    { name: 'Internet bill',          amount: 1299, category: UTIL,   date: date(11, 12), paidBy: name, splitWith: [] },
    { name: `Dinner with ${friendName}`, amount: 1400, category: FOOD, date: date(11, 18), paidBy: name, splitWith: [friendName] },
    // 10 months ago
    { name: 'Internet bill',          amount: 1299, category: UTIL,   date: date(10, 3),  paidBy: name, splitWith: [] },
    { name: 'Movie night',            amount: 560,  category: ENT,    date: date(10, 15), paidBy: name, splitWith: [friendName] },
    { name: 'Gym membership',         amount: 1500, category: HEALTH, date: date(10, 20), paidBy: name, splitWith: [] },
    { name: 'Grab rides',             amount: 380,  category: TRANS,  date: date(10, 25), paidBy: name, splitWith: [] },
    // 9 months ago
    { name: 'Groceries',              amount: 1920, category: FOOD,   date: date(9, 6),   paidBy: name, splitWith: [] },
    { name: 'Spotify',                amount: 169,  category: ENT,    date: date(9, 10),  paidBy: name, splitWith: [] },
    { name: 'Weekend trip fuel',      amount: 1800, category: TRANS,  date: date(9, 22),  paidBy: name, splitWith: [friendName] },
    { name: 'Electricity',            amount: 2100, category: UTIL,   date: date(9, 28),  paidBy: name, splitWith: [] },
    // 8 months ago
    { name: 'Phone bill',             amount: 899,  category: UTIL,   date: date(8, 8),   paidBy: name, splitWith: [] },
    { name: `Lunch with ${friendName}`, amount: 780, category: FOOD,  date: date(8, 14),  paidBy: name, splitWith: [friendName] },
    { name: 'Doctor visit',           amount: 800,  category: HEALTH, date: date(8, 25),  paidBy: name, splitWith: [] },
    { name: 'Coffee',                 amount: 260,  category: FOOD,   date: date(8, 29),  paidBy: name, splitWith: [] },
    // 7 months ago
    { name: 'Groceries',              amount: 2100, category: FOOD,   date: date(7, 4),   paidBy: name, splitWith: [] },
    { name: 'Netflix',                amount: 299,  category: ENT,    date: date(7, 10),  paidBy: name, splitWith: [] },
    { name: 'Concert tickets',        amount: 2400, category: ENT,    date: date(7, 17),  paidBy: name, splitWith: [friendName] },
    { name: 'Gym membership',         amount: 1500, category: HEALTH, date: date(7, 22),  paidBy: name, splitWith: [] },
    // 6 months ago
    { name: 'Electricity',            amount: 1980, category: UTIL,   date: date(6, 7),   paidBy: name, splitWith: [] },
    { name: 'Grab rides',             amount: 320,  category: TRANS,  date: date(6, 14),  paidBy: name, splitWith: [] },
    { name: 'Groceries',              amount: 1880, category: FOOD,   date: date(6, 20),  paidBy: name, splitWith: [] },
    { name: `Beach trip`,             amount: 3200, category: TRAVEL, date: date(6, 26),  paidBy: name, splitWith: [friendName] },
    // 5 months ago
    { name: 'Groceries',              amount: 1760, category: FOOD,   date: date(5, 5),   paidBy: name, splitWith: [] },
    { name: 'Gym membership',         amount: 1500, category: HEALTH, date: date(5, 10),  paidBy: name, splitWith: [] },
    { name: 'Dinner out',             amount: 1100, category: FOOD,   date: date(5, 19),  paidBy: name, splitWith: [friendName] },
    { name: 'Internet bill',          amount: 1299, category: UTIL,   date: date(5, 28),  paidBy: name, splitWith: [] },
    // 4 months ago
    { name: 'Internet bill',          amount: 1299, category: UTIL,   date: date(4, 3),   paidBy: name, splitWith: [] },
    { name: 'Coffee',                 amount: 290,  category: FOOD,   date: date(4, 12),  paidBy: name, splitWith: [] },
    { name: 'Groceries',              amount: 1820, category: FOOD,   date: date(4, 18),  paidBy: name, splitWith: [] },
    { name: 'Spotify',                amount: 169,  category: ENT,    date: date(4, 22),  paidBy: name, splitWith: [] },
    // 3 months ago
    { name: 'Groceries',              amount: 1980, category: FOOD,   date: date(3, 6),   paidBy: name, splitWith: [] },
    { name: 'Phone bill',             amount: 899,  category: UTIL,   date: date(3, 11),  paidBy: name, splitWith: [] },
    { name: 'Road trip gas',          amount: 2200, category: TRANS,  date: date(3, 25),  paidBy: name, splitWith: [friendName] },
    { name: 'Electricity',            amount: 2150, category: UTIL,   date: date(3, 28),  paidBy: name, splitWith: [] },
    // 2 months ago
    { name: 'Netflix',                amount: 299,  category: ENT,    date: date(2, 5),   paidBy: name, splitWith: [] },
    { name: 'Groceries',              amount: 1700, category: FOOD,   date: date(2, 10),  paidBy: name, splitWith: [] },
    { name: 'Hotpot dinner',          amount: 1600, category: FOOD,   date: date(2, 18),  paidBy: name, splitWith: [friendName] },
    { name: 'Electricity',            amount: 2250, category: UTIL,   date: date(2, 22),  paidBy: name, splitWith: [] },
    // last month
    { name: 'Gym membership',         amount: 1500, category: HEALTH, date: date(1, 3),   paidBy: name, splitWith: [] },
    { name: 'Grab rides',             amount: 480,  category: TRANS,  date: date(1, 10),  paidBy: name, splitWith: [] },
    { name: 'Karaoke night',          amount: 1800, category: ENT,    date: date(1, 16),  paidBy: name, splitWith: [friendName] },
    { name: 'Groceries',              amount: 1850, category: FOOD,   date: date(1, 24),  paidBy: name, splitWith: [] },
    { name: 'Doctor visit',           amount: 750,  category: HEALTH, date: date(1, 27),  paidBy: name, splitWith: [] },
    // this month
    { name: 'Phone bill',             amount: 899,  category: UTIL,   date: date(0, 3),   paidBy: name, splitWith: [] },
    { name: 'Coffee',                 amount: 340,  category: FOOD,   date: date(0, 7),   paidBy: name, splitWith: [] },
    { name: `Lunch with ${friendName}`, amount: 950, category: FOOD,  date: date(0, 12),  paidBy: name, splitWith: [friendName] },
    { name: 'Groceries',              amount: 1650, category: FOOD,   date: date(0, 16),  paidBy: name, splitWith: [] },
  ]
}

// Pair each user with the next one for shared expenses (wraps around)
let totalExpenses = 0
for (let i = 0; i < users.length; i++) {
  const user = users[i]
  const friendName = ACCOUNTS[(i + 1) % users.length].name
  const userName = ACCOUNTS[i].name
  const docs = makeExpenses(userName, friendName).map(e => ({ userId: user._id, type: 'expense', ...e }))
  await Expense.insertMany(docs)
  totalExpenses += docs.length
}

console.log(`Inserted ${totalExpenses} expenses across ${users.length} users`)

await mongoose.disconnect()
console.log('\nCredentials (password: Test123! for all):')
ACCOUNTS.forEach(a => console.log(`  ${a.email.padEnd(20)} ${a.name}`))

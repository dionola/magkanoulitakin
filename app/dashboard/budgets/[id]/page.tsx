'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, Plus, Users, Trash2 } from 'lucide-react'

const mockBudget = {
  id: 1,
  name: 'Vacation Trip',
  description: 'Summer vacation to Europe',
  total: 2500,
  members: [
    { id: 1, name: 'You', email: 'you@example.com', percentage: 25 },
    { id: 2, name: 'Alice', email: 'alice@example.com', percentage: 25 },
    { id: 3, name: 'Bob', email: 'bob@example.com', percentage: 25 },
    { id: 4, name: 'Charlie', email: 'charlie@example.com', percentage: 25 },
  ],
  expenses: [
    {
      id: 1,
      name: 'Flight tickets',
      amount: 320,
      paidBy: 'You',
      date: '2024-01-15',
      splitType: 'equal',
      splitWith: ['You', 'Alice', 'Bob', 'Charlie'],
    },
    {
      id: 2,
      name: 'Hotel accommodation',
      amount: 450,
      paidBy: 'Alice',
      date: '2024-01-16',
      splitType: 'equal',
      splitWith: ['You', 'Alice', 'Bob', 'Charlie'],
    },
    {
      id: 3,
      name: 'Dinner',
      amount: 120,
      paidBy: 'Bob',
      date: '2024-01-17',
      splitType: 'custom',
      splitWith: ['You', 'Alice', 'Bob'],
    },
    {
      id: 4,
      name: 'Car rental',
      amount: 310,
      paidBy: 'Charlie',
      date: '2024-01-18',
      splitType: 'equal',
      splitWith: ['You', 'Alice', 'Bob', 'Charlie'],
    },
  ],
  settlements: [
    { from: 'You', to: 'Alice', amount: 75.50 },
    { from: 'Bob', to: 'Alice', amount: 45.00 },
    { from: 'You', to: 'Charlie', amount: 27.50 },
  ],
}

const splitTypes = [
  { value: 'equal', label: 'Equal split' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'itemized', label: 'Itemized' },
]

export default function BudgetDetailPage() {
  const params = useParams()
  const [expenses, setExpenses] = useState(mockBudget.expenses)
  const [newExpenseOpen, setNewExpenseOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    paidBy: 'You',
    splitType: 'equal',
  })

  const handleAddExpense = () => {
    if (newExpense.name && newExpense.amount) {
      setExpenses([
        ...expenses,
        {
          id: Math.max(...expenses.map(e => e.id), 0) + 1,
          name: newExpense.name,
          amount: parseFloat(newExpense.amount),
          paidBy: newExpense.paidBy,
          date: new Date().toISOString().split('T')[0],
          splitType: newExpense.splitType,
          splitWith: mockBudget.members.map(m => m.name),
        },
      ])
      setNewExpense({ name: '', amount: '', paidBy: 'You', splitType: 'equal' })
      setNewExpenseOpen(false)
    }
  }

  const handleDeleteExpense = (id: number) => {
    setExpenses(expenses.filter(e => e.id !== id))
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/budgets">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-light tracking-tight">{mockBudget.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{mockBudget.description}</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-name">Description</Label>
                  <Input
                    id="expense-name"
                    placeholder="e.g., Hotel booking"
                    value={newExpense.name}
                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                    className="bg-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount">Amount ($)</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paid-by">Paid By</Label>
                    <Select value={newExpense.paidBy} onValueChange={(value) => setNewExpense({ ...newExpense, paidBy: value })}>
                      <SelectTrigger className="bg-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mockBudget.members.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="split-type">Split Type</Label>
                  <Select value={newExpense.splitType} onValueChange={(value) => setNewExpense({ ...newExpense, splitType: value })}>
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {splitTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleAddExpense} className="w-full">
                  Add Expense
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Users className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="member-email">Email Address</Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="member@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  An invitation will be sent to this email address
                </p>
                <Button onClick={() => setAddMemberOpen(false)} className="w-full">
                  Send Invitation
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Spent</p>
          <p className="mt-2 text-2xl font-light">${totalSpent.toFixed(2)}</p>
          <p className="mt-1 text-xs text-muted-foreground">of ${mockBudget.total.toFixed(2)}</p>
        </Card>

        <Card className="border border-border p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Per Person</p>
          <p className="mt-2 text-2xl font-light">${(totalSpent / mockBudget.members.length).toFixed(2)}</p>
        </Card>

        <Card className="border border-border p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Members</p>
          <p className="mt-2 text-2xl font-light">{mockBudget.members.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card className="border border-border p-6">
            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                  <p className="text-center text-muted-foreground">No expenses yet</p>
                </div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                    <div>
                      <h4 className="font-medium">{expense.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {expense.date} • Paid by {expense.paidBy} • {expense.splitType}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">${expense.amount.toFixed(2)}</p>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="inline-flex items-center justify-center rounded-md p-2 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="border border-border p-6">
            <div className="space-y-4">
              {mockBudget.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                  <div>
                    <h4 className="font-medium">{member.name}</h4>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{member.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements">
          <Card className="border border-border p-6">
            <div className="space-y-4">
              {mockBudget.settlements.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-8">
                  <p className="text-center text-muted-foreground">All settled up!</p>
                </div>
              ) : (
                mockBudget.settlements.map((settlement, idx) => (
                  <div key={idx} className="rounded-lg border border-border/50 p-4">
                    <p className="text-sm">
                      <span className="font-medium">{settlement.from}</span>
                      {' '}
                      owes
                      {' '}
                      <span className="font-medium">{settlement.to}</span>
                      {' '}
                      <span className="font-medium text-primary">${settlement.amount.toFixed(2)}</span>
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, Users, Trash2 } from 'lucide-react'

const mockBudgets = [
  {
    id: 1,
    name: 'Vacation Trip',
    description: 'Summer vacation to Europe',
    total: 2500,
    spent: 1200,
    members: ['You', 'Alice', 'Bob', 'Charlie'],
    created: '2024-01-15',
  },
  {
    id: 2,
    name: 'House Rent',
    description: 'Monthly shared apartment rent',
    total: 3000,
    spent: 3000,
    members: ['You', 'David', 'Eve'],
    created: '2024-01-01',
  },
  {
    id: 3,
    name: 'Weekend Getaway',
    description: 'Cabin rental and activities',
    total: 1200,
    spent: 450,
    members: ['You', 'Frank'],
    created: '2024-01-20',
  },
]

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState(mockBudgets)
  const [searchTerm, setSearchTerm] = useState('')
  const [newBudgetOpen, setNewBudgetOpen] = useState(false)
  const [newBudget, setNewBudget] = useState({ name: '', description: '', total: '' })

  const filteredBudgets = budgets.filter(
    (b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           b.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddBudget = () => {
    if (newBudget.name && newBudget.total) {
      setBudgets([
        ...budgets,
        {
          id: Math.max(...budgets.map(b => b.id), 0) + 1,
          name: newBudget.name,
          description: newBudget.description,
          total: parseFloat(newBudget.total),
          spent: 0,
          members: ['You'],
          created: new Date().toISOString().split('T')[0],
        },
      ])
      setNewBudget({ name: '', description: '', total: '' })
      setNewBudgetOpen(false)
    }
  }

  const handleDeleteBudget = (id: number) => {
    setBudgets(budgets.filter(b => b.id !== id))
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Budgets</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your shared budgets and expenses</p>
        </div>

        <Dialog open={newBudgetOpen} onOpenChange={setNewBudgetOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Budget Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Vacation Trip"
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="What's this budget for?"
                  value={newBudget.description}
                  onChange={(e) => setNewBudget({ ...newBudget, description: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total">Total Budget ($)</Label>
                <Input
                  id="total"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newBudget.total}
                  onChange={(e) => setNewBudget({ ...newBudget, total: e.target.value })}
                  className="bg-secondary"
                />
              </div>
              <Button onClick={handleAddBudget} className="w-full">
                Create Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search budgets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary pl-10"
        />
      </div>

      {/* Budgets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredBudgets.map((budget) => {
          const percentage = (budget.spent / budget.total) * 100
          return (
            <Card key={budget.id} className="border border-border p-6 flex flex-col gap-4">
              <div>
                <Link href={`/dashboard/budgets/${budget.id}`} className="hover:underline">
                  <h3 className="font-medium">{budget.name}</h3>
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{budget.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Spending</span>
                  <span className="font-medium">${budget.spent.toFixed(2)} / ${budget.total.toFixed(2)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(0)}%</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{budget.members.length} members</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Link href={`/dashboard/budgets/${budget.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    View
                  </Button>
                </Link>
                <button
                  onClick={() => handleDeleteBudget(budget.id)}
                  className="inline-flex items-center justify-center rounded-md border border-border p-2 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredBudgets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <p className="text-center text-muted-foreground">No budgets found</p>
          <Button variant="outline" size="sm" className="mt-4 bg-transparent" onClick={() => setNewBudgetOpen(true)}>
            Create your first budget
          </Button>
        </div>
      )}
    </div>
  )
}

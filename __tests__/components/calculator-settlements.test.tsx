/**
 * Integration test for calculator settlement calculations
 * Tests the settlement logic in the context of the calculator component
 */

import { calculateSettlements, getExpenseTotals } from '@/lib/utils/settlements'

describe('Calculator Settlement Integration', () => {
  it('should correctly calculate settlements for the reported bug case', () => {
    const people = [
      { id: 'rein', name: 'Rein' },
      { id: 'stephen', name: 'Stephen Dionola' },
      { id: 'marcus', name: 'Marcus' },
    ]

    const expenses = [
      {
        id: '1',
        name: 'Tickets',
        amount: 2100,
        paidBy: 'stephen',
        splitWith: ['rein', 'stephen', 'marcus'],
        splitType: 'equal' as const,
        splitData: {},
      },
      {
        id: '2',
        name: 'Toll + Gas',
        amount: 2000,
        paidBy: 'marcus',
        splitWith: ['rein', 'stephen', 'marcus'],
        splitType: 'equal' as const,
        splitData: {},
      },
    ]

    const settlements = calculateSettlements(people, expenses)
    const totals = getExpenseTotals(people, expenses)

    // Verify no self-payments
    settlements.forEach(settlement => {
      expect(settlement.from).not.toBe(settlement.to)
    })

    // Verify totals match expected values
    expect(totals['rein'].paid).toBeCloseTo(0, 2)
    expect(totals['rein'].owes).toBeCloseTo(1366.67, 2)
    expect(totals['rein'].balance).toBeCloseTo(-1366.67, 2)

    expect(totals['stephen'].paid).toBeCloseTo(2100, 2)
    expect(totals['stephen'].owes).toBeCloseTo(1366.67, 2)
    expect(totals['stephen'].balance).toBeCloseTo(733.33, 2)

    expect(totals['marcus'].paid).toBeCloseTo(2000, 2)
    expect(totals['marcus'].owes).toBeCloseTo(1366.67, 2)
    expect(totals['marcus'].balance).toBeCloseTo(633.33, 2)

    // Verify settlements
    expect(settlements).toHaveLength(2)
    
    // Rein should pay both Stephen and Marcus
    const reinToStephen = settlements.find(s => s.from === 'rein' && s.to === 'stephen')
    const reinToMarcus = settlements.find(s => s.from === 'rein' && s.to === 'marcus')
    
    expect(reinToStephen).toBeDefined()
    expect(reinToMarcus).toBeDefined()
    
    // Verify amounts
    expect(reinToStephen?.amount).toBeCloseTo(733.33, 1)
    expect(reinToMarcus?.amount).toBeCloseTo(633.33, 1)

    // Verify total settlements equal total debt
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
    const totalDebt = Math.abs(totals['rein'].balance)
    expect(totalSettled).toBeCloseTo(totalDebt, 1)
  })

  it('should handle edge case with single expense', () => {
    const people = [
      { id: 'alice', name: 'Alice' },
      { id: 'bob', name: 'Bob' },
    ]

    const expenses = [
      {
        id: '1',
        name: 'Dinner',
        amount: 100,
        paidBy: 'alice',
        splitWith: ['alice', 'bob'],
        splitType: 'equal' as const,
        splitData: {},
      },
    ]

    const settlements = calculateSettlements(people, expenses)
    const totals = getExpenseTotals(people, expenses)

    // Alice paid 100, owes 50, balance: +50
    // Bob owes 50, balance: -50
    expect(totals['alice'].paid).toBe(100)
    expect(totals['alice'].owes).toBe(50)
    expect(totals['alice'].balance).toBe(50)

    expect(totals['bob'].paid).toBe(0)
    expect(totals['bob'].owes).toBe(50)
    expect(totals['bob'].balance).toBe(-50)

    // Bob should pay Alice 50
    expect(settlements).toHaveLength(1)
    expect(settlements[0].from).toBe('bob')
    expect(settlements[0].to).toBe('alice')
    expect(settlements[0].amount).toBe(50)
  })

  it('should handle complex scenario with multiple people and expenses', () => {
    const people = [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
      { id: 'c', name: 'Charlie' },
      { id: 'd', name: 'Diana' },
    ]

    const expenses = [
      {
        id: '1',
        name: 'Expense 1',
        amount: 400,
        paidBy: 'a',
        splitWith: ['a', 'b', 'c', 'd'],
        splitType: 'equal' as const,
        splitData: {},
      },
      {
        id: '2',
        name: 'Expense 2',
        amount: 400,
        paidBy: 'b',
        splitWith: ['a', 'b', 'c', 'd'],
        splitType: 'equal' as const,
        splitData: {},
      },
    ]

    const settlements = calculateSettlements(people, expenses)
    const totals = getExpenseTotals(people, expenses)

    // Verify no self-payments
    settlements.forEach(settlement => {
      expect(settlement.from).not.toBe(settlement.to)
    })

    // Verify balances sum to zero
    const totalBalance = Object.values(totals).reduce((sum, t) => sum + t.balance, 0)
    expect(totalBalance).toBeCloseTo(0, 2)

    // Verify settlements cover all debts
    const totalDebt = Object.values(totals)
      .filter(t => t.balance < 0)
      .reduce((sum, t) => sum + Math.abs(t.balance), 0)
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
    expect(totalSettled).toBeCloseTo(totalDebt, 1)
  })
})


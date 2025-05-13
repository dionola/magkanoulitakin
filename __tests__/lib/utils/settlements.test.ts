import { calculateSettlements, calculateBalances, getExpenseTotals } from '@/lib/utils/settlements'
import type { Person, Expense } from '@/lib/utils/settlements'

describe('Settlement Calculations', () => {
  describe('calculateSettlements', () => {
    it('should handle the bug case: 3 people with 2 expenses', () => {
      const people: Person[] = [
        { id: 'rein', name: 'Rein' },
        { id: 'stephen', name: 'Stephen Dionola' },
        { id: 'marcus', name: 'Marcus' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Tickets',
          amount: 2100,
          paidBy: 'stephen',
          splitWith: ['rein', 'stephen', 'marcus'],
          splitType: 'equal',
          splitData: {},
        },
        {
          id: '2',
          name: 'Toll + Gas',
          amount: 2000,
          paidBy: 'marcus',
          splitWith: ['rein', 'stephen', 'marcus'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const settlements = calculateSettlements(people, expenses)

      // Should have 2 settlements
      expect(settlements).toHaveLength(2)

      // Rein should pay Stephen
      const reinToStephen = settlements.find(s => s.from === 'rein' && s.to === 'stephen')
      expect(reinToStephen).toBeDefined()
      expect(reinToStephen?.amount).toBeCloseTo(733.33, 2)

      // Rein should pay Marcus
      const reinToMarcus = settlements.find(s => s.from === 'rein' && s.to === 'marcus')
      expect(reinToMarcus).toBeDefined()
      expect(reinToMarcus?.amount).toBeCloseTo(633.33, 2)

      // No one should pay themselves
      settlements.forEach(settlement => {
        expect(settlement.from).not.toBe(settlement.to)
      })

      // Verify total settlement amounts
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0)
      expect(totalSettled).toBeCloseTo(1366.67, 1) // Allow 0.1 precision for floating point
    })

    it('should create settlement when one person owes another', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Dinner',
          amount: 100,
          paidBy: 'alice',
          splitWith: ['alice', 'bob'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const settlements = calculateSettlements(people, expenses)
      // Alice paid 100, owes 50, balance: +50
      // Bob owes 50, balance: -50
      // Bob should pay Alice 50
      expect(settlements).toHaveLength(1)
      expect(settlements[0].from).toBe('bob')
      expect(settlements[0].to).toBe('alice')
      expect(settlements[0].amount).toBeCloseTo(50, 2)
    })

    it('should handle single person expense', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Coffee',
          amount: 50,
          paidBy: 'alice',
          splitWith: ['alice'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const settlements = calculateSettlements(people, expenses)
      expect(settlements).toHaveLength(0)
    })

    it('should handle multiple debtors and creditors', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
        { id: 'charlie', name: 'Charlie' },
        { id: 'diana', name: 'Diana' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Expense 1',
          amount: 400,
          paidBy: 'alice',
          splitWith: ['alice', 'bob', 'charlie', 'diana'],
          splitType: 'equal',
          splitData: {},
        },
        {
          id: '2',
          name: 'Expense 2',
          amount: 400,
          paidBy: 'bob',
          splitWith: ['alice', 'bob', 'charlie', 'diana'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const settlements = calculateSettlements(people, expenses)

      // Alice paid 400, owes 200, balance: +200
      // Bob paid 400, owes 200, balance: +200
      // Charlie owes 200, balance: -200
      // Diana owes 200, balance: -200

      expect(settlements).toHaveLength(2)
      
      // Charlie should pay Alice or Bob
      const charlieSettlement = settlements.find(s => s.from === 'charlie')
      expect(charlieSettlement).toBeDefined()
      expect(charlieSettlement?.amount).toBeCloseTo(200, 2)

      // Diana should pay Alice or Bob
      const dianaSettlement = settlements.find(s => s.from === 'diana')
      expect(dianaSettlement).toBeDefined()
      expect(dianaSettlement?.amount).toBeCloseTo(200, 2)

      // No self-payments
      settlements.forEach(settlement => {
        expect(settlement.from).not.toBe(settlement.to)
      })
    })

    it('should handle person not in split', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
        { id: 'charlie', name: 'Charlie' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Dinner',
          amount: 300,
          paidBy: 'alice',
          splitWith: ['alice', 'bob'], // Charlie not in split
          splitType: 'equal',
          splitData: {},
        },
      ]

      const settlements = calculateSettlements(people, expenses)

      // Alice paid 300, owes 150, balance: +150
      // Bob owes 150, balance: -150
      // Charlie owes 0, balance: 0

      expect(settlements).toHaveLength(1)
      expect(settlements[0].from).toBe('bob')
      expect(settlements[0].to).toBe('alice')
      expect(settlements[0].amount).toBeCloseTo(150, 2)
    })
  })

  describe('calculateBalances', () => {
    it('should calculate correct balances', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
        { id: 'bob', name: 'Bob' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Dinner',
          amount: 100,
          paidBy: 'alice',
          splitWith: ['alice', 'bob'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const balances = calculateBalances(people, expenses)

      // Alice paid 100, owes 50, balance: +50
      // Bob owes 50, balance: -50
      expect(balances['alice']).toBeCloseTo(50, 2)
      expect(balances['bob']).toBeCloseTo(-50, 2)
    })

    it('should handle person paying for themselves only', () => {
      const people: Person[] = [
        { id: 'alice', name: 'Alice' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Coffee',
          amount: 50,
          paidBy: 'alice',
          splitWith: ['alice'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const balances = calculateBalances(people, expenses)
      expect(balances['alice']).toBeCloseTo(0, 2)
    })
  })

  describe('getExpenseTotals', () => {
    it('should calculate correct totals', () => {
      const people: Person[] = [
        { id: 'rein', name: 'Rein' },
        { id: 'stephen', name: 'Stephen Dionola' },
        { id: 'marcus', name: 'Marcus' },
      ]

      const expenses: Expense[] = [
        {
          id: '1',
          name: 'Tickets',
          amount: 2100,
          paidBy: 'stephen',
          splitWith: ['rein', 'stephen', 'marcus'],
          splitType: 'equal',
          splitData: {},
        },
        {
          id: '2',
          name: 'Toll + Gas',
          amount: 2000,
          paidBy: 'marcus',
          splitWith: ['rein', 'stephen', 'marcus'],
          splitType: 'equal',
          splitData: {},
        },
      ]

      const totals = getExpenseTotals(people, expenses)

      // Rein: paid 0, owes 1366.67, balance: -1366.67
      expect(totals['rein'].paid).toBeCloseTo(0, 2)
      expect(totals['rein'].owes).toBeCloseTo(1366.67, 2)
      expect(totals['rein'].balance).toBeCloseTo(-1366.67, 2)

      // Stephen: paid 2100 (gross), owes 1366.67, balance: 733.33
      // Expense 1: 2100 / 3 = 700 per person (Stephen owes 700)
      // Expense 2: 2000 / 3 = 666.67 per person (Stephen owes 666.67)
      // Total owes: 700 + 666.67 = 1366.67
      // Balance: 2100 - 1366.67 = 733.33
      expect(totals['stephen'].paid).toBeCloseTo(2100, 2)
      expect(totals['stephen'].owes).toBeCloseTo(1366.67, 2)
      expect(totals['stephen'].balance).toBeCloseTo(733.33, 2)

      // Marcus: paid 2000 (gross), owes 1366.67, balance: 633.33
      // Expense 1: 2100 / 3 = 700 per person (Marcus owes 700)
      // Expense 2: 2000 / 3 = 666.67 per person (Marcus owes 666.67)
      // Total owes: 700 + 666.67 = 1366.67
      // Balance: 2000 - 1366.67 = 633.33
      expect(totals['marcus'].paid).toBeCloseTo(2000, 2)
      expect(totals['marcus'].owes).toBeCloseTo(1366.67, 2)
      expect(totals['marcus'].balance).toBeCloseTo(633.33, 2)
    })
  })
})


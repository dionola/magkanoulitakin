'use client'

import { Trash2 } from 'lucide-react'
import type { Person } from '@/lib/types'

interface FriendOption {
  id: string
  name: string
}

interface PeoplePanelProps {
  people: Person[]
  newPersonName: string
  editingPersonId: string | null
  editingPersonName: string
  friendSuggestionsOpen: boolean
  friends: FriendOption[]
  addPersonRef: React.RefObject<HTMLDivElement | null>
  onNewPersonNameChange: (value: string) => void
  onEditingPersonNameChange: (value: string) => void
  onOpenSuggestions: () => void
  onCloseSuggestions: () => void
  onAddPerson: () => void
  onRemovePerson: (id: string) => void
  onStartEditPerson: (person: Person) => void
  onSaveEditPerson: (id: string) => void
  onSelectFriend: (friend: FriendOption) => void
}

export function PeoplePanel({
  people,
  newPersonName,
  editingPersonId,
  editingPersonName,
  friendSuggestionsOpen,
  friends,
  addPersonRef,
  onNewPersonNameChange,
  onEditingPersonNameChange,
  onOpenSuggestions,
  onCloseSuggestions,
  onAddPerson,
  onRemovePerson,
  onStartEditPerson,
  onSaveEditPerson,
  onSelectFriend,
}: PeoplePanelProps) {
  const availableFriends = friends.filter(
    (friend) =>
      !people.find((person) => person.id === friend.id) &&
      friend.name.toLowerCase().includes(newPersonName.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-4xl font-bold mb-8">People</h2>
      <div className="space-y-3 mb-6">
        {people.map((person) => (
          <div key={person.id} className="group flex items-center justify-between">
            {editingPersonId === person.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  autoFocus
                  type="text"
                  value={editingPersonName}
                  onChange={(event) => onEditingPersonNameChange(event.target.value)}
                  onKeyPress={(event) => event.key === 'Enter' && onSaveEditPerson(person.id)}
                  className="flex-1 bg-transparent text-lg font-bold outline-none border-b-2 border-foreground/30 focus:border-foreground"
                />
                <button
                  onClick={() => onSaveEditPerson(person.id)}
                  className="font-bold text-sm opacity-70 hover:opacity-100"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onStartEditPerson(person)}
                  className="text-xl font-bold text-left cursor-pointer hover:opacity-70 transition"
                >
                  {person.name}
                </button>
                {people.length > 1 && (
                  <button
                    onClick={() => onRemovePerson(person.id)}
                    className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="relative" ref={addPersonRef}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add person"
            value={newPersonName}
            onChange={(event) => {
              onNewPersonNameChange(event.target.value)
              onOpenSuggestions()
            }}
            onFocus={onOpenSuggestions}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onAddPerson()
                onCloseSuggestions()
              }
            }}
            className="flex-1 bg-transparent text-lg font-bold outline-none border-b-2 border-muted-foreground/30 focus:border-foreground"
          />
          <button
            onClick={() => {
              onAddPerson()
              onCloseSuggestions()
            }}
            className="w-10 h-10 flex items-center justify-center text-2xl font-bold opacity-50 hover:opacity-100 transition"
          >
            +
          </button>
        </div>
        {friendSuggestionsOpen && availableFriends.length > 0 ? (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-foreground/20 rounded-lg shadow-lg z-10">
            {availableFriends.map((friend) => (
              <button
                key={friend.id}
                onMouseDown={(event) => {
                  event.preventDefault()
                  onSelectFriend(friend)
                }}
                className="w-full text-left px-4 py-3 font-bold text-base hover:opacity-70 transition border-b border-foreground/20 last:border-b-0"
              >
                {friend.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

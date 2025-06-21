"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SequencesList } from "@/components/sequences/sequences-list"
import { GlobalVariablesList } from "@/components/variables/global-variables-list"
import { GlobalListsList } from "@/components/lists/global-lists-list"
import { CreateSequenceModal } from "@/components/modals/create-sequence-modal"
import { CreateVariableModal } from "@/components/modals/create-variable-modal"
import { CreateListModal } from "@/components/modals/create-list-modal"
import { LoginModal } from "@/components/auth/login-modal"
import { useAuth } from "@/hooks/use-auth"

export default function HomePage() {
  const { user, logout } = useAuth()
  const [showCreateSequence, setShowCreateSequence] = useState(false)
  const [showCreateVariable, setShowCreateVariable] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    if (!user) {
      setShowLogin(true)
    }
  }, [user])

  if (!user) {
    return <LoginModal open={showLogin} onOpenChange={setShowLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI Sequence Generator</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCreateList(true)}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              + Add New List
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateSequence(true)}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              + Add New Sequence
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateVariable(true)}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              + Add New Global Variable
            </Button>
            <Button className="bg-orange-500 text-white px-3 py-2 rounded text-sm font-medium cursor-pointer"
              onClick={() => setShowCreateSequence(true)}
              style={{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}
            >
              Create Sequence
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Logout ({user.name})
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sequences Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">List Of Current Sequences</h2>
            <SequencesList />
          </div>

          {/* Global Variables Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">List Of Global Variables</h2>
            <GlobalVariablesList />
          </div>

          {/* Global Lists Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">List Of Global Lists</h2>
            <GlobalListsList />
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateSequenceModal open={showCreateSequence} onOpenChange={setShowCreateSequence} />
      <CreateVariableModal open={showCreateVariable} onOpenChange={setShowCreateVariable} />
      <CreateListModal open={showCreateList} onOpenChange={setShowCreateList} />
    </div>
  )
}

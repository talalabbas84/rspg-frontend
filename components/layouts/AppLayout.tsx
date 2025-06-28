"use client";

import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/auth/login-modal";
import { CreateSequenceModal } from "@/components/modals/create-sequence-modal";
import { CreateVariableModal } from "@/components/modals/create-variable-modal";
import { CreateListModal } from "@/components/modals/create-list-modal";
import { useAuth } from "@/hooks/use-auth";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [showCreateSequence, setShowCreateSequence] = useState(false);
  const [showCreateVariable, setShowCreateVariable] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) setShowLogin(true);
  }, [user]);

  if (!user) {
    return <LoginModal open={showLogin} onOpenChange={setShowLogin} />;
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
            {/* <Button
              variant="outline"
              onClick={() => setShowCreateSequence(true)}
              className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              + Add New Sequence
            </Button> */}
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
              Logout ({user?.email})
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">{children}</main>

      {/* Modals */}
      <CreateSequenceModal open={showCreateSequence} onOpenChange={setShowCreateSequence} />
      <CreateVariableModal open={showCreateVariable} onOpenChange={setShowCreateVariable} />
      <CreateListModal open={showCreateList} onOpenChange={setShowCreateList} />
    </div>
  );
}

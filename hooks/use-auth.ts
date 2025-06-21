"use client"

import { useState, useEffect, createContext, useContext } from "react"

interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  const [user, setUser] = useState<User | null>(null) // Moved useState here

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call your API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (email === "demo@example.com" && password === "password") {
      const mockUser = { id: "1", name: "Demo User", email: "demo@example.com" }
      setUser(mockUser)
      localStorage.setItem("user", JSON.stringify(mockUser))
    } else {
      throw new Error("Invalid credentials")
    }
  }

  const register = async (name: string, email: string, password: string) => {
    // Mock registration - in real app, this would call your API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockUser = { id: Date.now().toString(), name, email }
    setUser(mockUser)
    localStorage.setItem("user", JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  // Check for existing user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  if (!context) {
    // Return a mock implementation for now
    return { user, login, register, logout }
  }
  return context
}

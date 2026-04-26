import { useState } from 'react'
import { AppScreen, User } from '../lib/types'
import Landing from '../components/Landing'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [user, setUser] = useState<User | null>(null)

  const handleAuthSuccess = (u: User) => {
    setUser(u)
    setScreen('dashboard')
  }

  const handleLogout = () => {
    setUser(null)
    setScreen('landing')
  }

  return (
    <>
      {screen === 'landing' && (
        <Landing onEnter={() => setScreen('auth')} />
      )}
      {screen === 'auth' && (
        <Auth
          onSuccess={handleAuthSuccess}
          onBack={() => setScreen('landing')}
        />
      )}
      {screen === 'dashboard' && user && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  )
}

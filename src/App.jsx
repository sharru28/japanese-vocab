import { useState } from 'react'
import UserSelect from './pages/UserSelect'
import Home from './pages/Home'
import WordManager from './pages/WordManager'
import FlashCard from './pages/FlashCard'
import TypingQuiz from './pages/TypingQuiz'
import Matching from './pages/Matching'
import './index.css'

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('jv_user') || null)
  const [page, setPage] = useState('home')

  const handleSelectUser = (name) => {
    localStorage.setItem('jv_user', name)
    setUser(name)
    setPage('home')
  }

  const handleLogout = () => {
    localStorage.removeItem('jv_user')
    setUser(null)
    setPage('home')
  }

  if (!user) return <UserSelect onSelect={handleSelectUser} />

  const go = (p) => setPage(p)

  return (
    <div className="app">
      {page === 'home'      && <Home user={user} onNavigate={go} onLogout={handleLogout} />}
      {page === 'words'     && <WordManager onBack={() => go('home')} />}
      {page === 'flashcard' && <FlashCard user={user} onBack={() => go('home')} />}
      {page === 'typing'    && <TypingQuiz user={user} onBack={() => go('home')} />}
      {page === 'matching'  && <Matching user={user} onBack={() => go('home')} />}
    </div>
  )
}

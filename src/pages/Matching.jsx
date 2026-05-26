import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

export default function Matching({ user, onBack }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState('idle') // idle | playing | done
  const [pairs, setPairs] = useState([])
  const [leftItems, setLeftItems] = useState([])
  const [rightItems, setRightItems] = useState([])
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [selectedRight, setSelectedRight] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrong, setWrong] = useState(new Set())
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [mistakes, setMistakes] = useState(0)

  useEffect(() => {
    supabase.from('words').select('*').then(({ data }) => {
      setWords(data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (gameState !== 'playing') return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 500)
    return () => clearInterval(t)
  }, [gameState, startTime])

  const startGame = () => {
    const count = Math.min(8, words.length)
    const selected = shuffle(words).slice(0, count)
    setPairs(selected)
    setLeftItems(shuffle(selected.map(w => ({ id: w.id, text: w.kanji ? `${w.kanji}（${w.kana}）` : w.kana }))))
    setRightItems(shuffle(selected.map(w => ({ id: w.id, text: w.meaning }))))
    setMatched(new Set())
    setWrong(new Set())
    setSelectedLeft(null)
    setSelectedRight(null)
    setMistakes(0)
    setStartTime(Date.now())
    setElapsed(0)
    setGameState('playing')
  }

  useEffect(() => {
    if (!selectedLeft || !selectedRight) return
    if (selectedLeft.id === selectedRight.id) {
      const newMatched = new Set([...matched, selectedLeft.id])
      setMatched(newMatched)
      setSelectedLeft(null)
      setSelectedRight(null)
      if (newMatched.size === pairs.length) {
        setGameState('done')
      }
    } else {
      setMistakes(m => m + 1)
      const wrongIds = new Set([selectedLeft.id + '_l', selectedRight.id + '_r'])
      setWrong(wrongIds)
      setTimeout(() => {
        setWrong(new Set())
        setSelectedLeft(null)
        setSelectedRight(null)
      }, 600)
    }
  }, [selectedLeft, selectedRight])

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (loading) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>連連看</h2></div>
      <div className="empty"><div className="empty-icon">⏳</div>載入中...</div>
    </div>
  )

  if (words.length < 2) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>連連看</h2></div>
      <div className="empty"><div className="empty-icon">📭</div>至少需要 2 個單字才能玩！</div>
    </div>
  )

  if (gameState === 'idle') return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>連連看</h2></div>
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>連連看</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          每局隨機抽 {Math.min(8, words.length)} 對，把日文和中文配對起來！
        </p>
        <button className="btn btn-primary" style={{ padding: '16px 48px', fontSize: 17 }} onClick={startGame}>
          開始！
        </button>
      </div>
    </div>
  )

  if (gameState === 'done') return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>完成！</h2></div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{mistakes === 0 ? '🏆' : mistakes <= 3 ? '🎉' : '👍'}</div>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>配對完成！</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(elapsed)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>花費時間</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{mistakes}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>答錯次數</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          <button className="btn btn-primary btn-full" onClick={startGame}>再來一局</button>
          <button className="btn btn-ghost btn-full" onClick={onBack}>回首頁</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>連連看</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(elapsed)}
        </span>
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        <span>已配對 {matched.size} / {pairs.length}</span>
        <span>錯誤 {mistakes} 次</span>
      </div>

      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Left: Japanese */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leftItems.map(item => {
            const isMatched = matched.has(item.id)
            const isSelected = selectedLeft?.id === item.id
            const isWrong = wrong.has(item.id + '_l')
            return (
              <button
                key={item.id}
                onClick={() => !isMatched && !isWrong && setSelectedLeft(isSelected ? null : item)}
                style={{
                  padding: '14px 10px', borderRadius: 12, border: '2px solid',
                  fontSize: 14, fontWeight: 500, cursor: isMatched ? 'default' : 'pointer',
                  transition: 'all 0.15s', textAlign: 'center', minHeight: 54,
                  WebkitTapHighlightColor: 'transparent',
                  background: isMatched ? 'var(--success-light)'
                    : isWrong ? 'var(--error-light)'
                    : isSelected ? 'var(--primary-light)'
                    : 'var(--surface)',
                  borderColor: isMatched ? 'var(--success)'
                    : isWrong ? 'var(--error)'
                    : isSelected ? 'var(--primary)'
                    : 'var(--border)',
                  color: isMatched ? 'var(--success)'
                    : isWrong ? 'var(--error)'
                    : isSelected ? 'var(--primary)'
                    : 'var(--text)',
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                {item.text}
              </button>
            )
          })}
        </div>

        {/* Right: Chinese */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rightItems.map(item => {
            const isMatched = matched.has(item.id)
            const isSelected = selectedRight?.id === item.id
            const isWrong = wrong.has(item.id + '_r')
            return (
              <button
                key={item.id}
                onClick={() => !isMatched && !isWrong && setSelectedRight(isSelected ? null : item)}
                style={{
                  padding: '14px 10px', borderRadius: 12, border: '2px solid',
                  fontSize: 14, fontWeight: 500, cursor: isMatched ? 'default' : 'pointer',
                  transition: 'all 0.15s', textAlign: 'center', minHeight: 54,
                  WebkitTapHighlightColor: 'transparent',
                  background: isMatched ? 'var(--success-light)'
                    : isWrong ? 'var(--error-light)'
                    : isSelected ? 'var(--primary-light)'
                    : 'var(--surface)',
                  borderColor: isMatched ? 'var(--success)'
                    : isWrong ? 'var(--error)'
                    : isSelected ? 'var(--primary)'
                    : 'var(--border)',
                  color: isMatched ? 'var(--success)'
                    : isWrong ? 'var(--error)'
                    : isSelected ? 'var(--primary)'
                    : 'var(--text)',
                  opacity: isMatched ? 0.7 : 1,
                }}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

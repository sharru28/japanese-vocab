import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MODES = [
  { id: 'flashcard', icon: '🃏', label: '翻卡片', desc: '看假名，猜中文' },
  { id: 'typing',    icon: '⌨️', label: '打字測驗', desc: '輸入答案測記憶' },
  { id: 'matching',  icon: '🔗', label: '連連看', desc: '配對日文和中文' },
]

export default function Home({ user, onNavigate, onLogout }) {
  const [stats, setStats] = useState({ total: 0, reviewed: 0, correct: 0, wrong: 0 })

  useEffect(() => {
    const load = async () => {
      const [{ count: total }, { data: progress }] = await Promise.all([
        supabase.from('words').select('*', { count: 'exact', head: true }),
        supabase.from('user_progress').select('correct_count, wrong_count').eq('user_name', user),
      ])
      if (progress) {
        const reviewed = progress.length
        const correct = progress.reduce((s, r) => s + (r.correct_count || 0), 0)
        const wrong = progress.reduce((s, r) => s + (r.wrong_count || 0), 0)
        setStats({ total: total || 0, reviewed, correct, wrong })
      } else {
        setStats(s => ({ ...s, total: total || 0 }))
      }
    }
    load()
  }, [user])

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '20px 16px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>こんにちは</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{user} 👋</div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 13, padding: '8px 14px' }}
          onClick={onLogout}
        >
          切換
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: '總單字', value: stats.total, icon: '📚' },
          { label: '已複習', value: stats.reviewed, icon: '✅' },
          { label: '答對率', value: stats.correct + stats.wrong > 0
              ? `${Math.round(stats.correct / (stats.correct + stats.wrong) * 100)}%`
              : '—', icon: '🎯' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Practice modes */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          複習模式
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => onNavigate(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 28 }}>{m.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{m.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Word manager */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          單字庫
        </div>
        <button
          onClick={() => onNavigate('words')}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 28 }}>📝</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>管理單字</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>新增、編輯、匯入 CSV</div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 18 }}>›</span>
        </button>
      </div>
    </div>
  )
}

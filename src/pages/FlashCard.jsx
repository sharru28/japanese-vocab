import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// 優先順序：null(未標記) → 0(完全想不起來) → 1(有點印象) → 2(我很會了)
function sortByFamiliarity(words, progressMap) {
  const priority = (word) => {
    const p = progressMap[word.id]
    if (!p || p.familiarity === null || p.familiarity === undefined) return 0
    return p.familiarity + 1
  }
  const groups = [[], [], [], []]
  words.forEach(w => groups[priority(w)].push(w))
  return [...shuffle(groups[0]), ...shuffle(groups[1]), ...shuffle(groups[2]), ...shuffle(groups[3])]
}

const LABELS = [
  { value: 0, text: '完全想不起來', color: '#ef4444' },
  { value: 1, text: '有點印象', color: '#f59e0b' },
  { value: 2, text: '我很會了', color: '#22c55e' },
]

export default function FlashCard({ user, onBack }) {
  const [words, setWords] = useState([])
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: wordsData } = await supabase.from('words').select('*')
      if (!wordsData || wordsData.length === 0) { setLoading(false); return }

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('word_id, familiarity')
        .eq('user_name', user)

      const progressMap = {}
      if (progressData) progressData.forEach(p => { progressMap[p.word_id] = p })

      setWords(wordsData)
      setQueue(sortByFamiliarity(wordsData, progressMap))
      setLoading(false)
    }
    load()
  }, [])

  const current = queue[idx]

  const handleMark = async (value) => {
    const { data: existing } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_name', user)
      .eq('word_id', current.id)
      .single()

    if (existing) {
      await supabase.from('user_progress')
        .update({ familiarity: value, last_reviewed: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('user_progress').insert({
        user_name: user,
        word_id: current.id,
        familiarity: value,
        correct_count: 0,
        wrong_count: 0,
      })
    }

    if (idx + 1 >= queue.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  const restart = async () => {
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('word_id, familiarity')
      .eq('user_name', user)
    const progressMap = {}
    if (progressData) progressData.forEach(p => { progressMap[p.word_id] = p })
    setQueue(sortByFamiliarity(words, progressMap))
    setIdx(0)
    setFlipped(false)
    setDone(false)
  }

  if (loading) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>翻卡片</h2></div>
      <div className="empty"><div className="empty-icon">⏳</div>載入中...</div>
    </div>
  )

  if (words.length === 0) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>翻卡片</h2></div>
      <div className="empty"><div className="empty-icon">📭</div>還沒有單字，先去新增吧！</div>
    </div>
  )

  if (done) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>翻卡片</h2></div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>這輪複習完成！</div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 32 }}>共複習了 {queue.length} 張卡片</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          <button className="btn btn-primary btn-full" onClick={restart}>再來一輪</button>
          <button className="btn btn-ghost btn-full" onClick={onBack}>回首頁</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>翻卡片</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{idx + 1} / {queue.length}</span>
      </div>

      <div style={{ height: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: `${(idx / queue.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: '24px 16px' }}>
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            minHeight: 220, background: 'var(--surface)', borderRadius: 20,
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 32,
            cursor: 'pointer', textAlign: 'center', marginBottom: 24,
            boxShadow: 'var(--shadow)', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {!flipped ? (
            <>
              {current.kanji && (
                <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{current.kanji}</div>
              )}
              <div style={{ fontSize: current.kanji ? 22 : 32, fontWeight: 600, color: current.kanji ? 'var(--text-muted)' : 'var(--text)' }}>
                {current.kana}
              </div>
              {current.tags && <span className="tag" style={{ marginTop: 16 }}>{current.tags}</span>}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>點擊翻面</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{current.meaning}</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{current.kana}</div>
            </>
          )}
        </div>

        {flipped && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LABELS.map(({ value, text, color }) => (
              <button
                key={value}
                onClick={() => handleMark(value)}
                style={{
                  padding: '14px 16px', borderRadius: 12, border: `2px solid ${color}`,
                  background: 'transparent', color, fontSize: 16, fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = color + '18'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function FlashCard({ user, onBack }) {
  const [words, setWords] = useState([])
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionResult, setSessionResult] = useState(null)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('words').select('*')
      if (!data || data.length === 0) { setLoading(false); return }
      setWords(data)
      setQueue(shuffle(data))
      setLoading(false)
    }
    load()
  }, [])

  const current = queue[idx]

  const recordProgress = async (wordId, isCorrect) => {
    const { data: existing } = await supabase
      .from('user_progress')
      .select('id, correct_count, wrong_count')
      .eq('user_name', user)
      .eq('word_id', wordId)
      .single()

    if (existing) {
      await supabase.from('user_progress').update({
        correct_count: existing.correct_count + (isCorrect ? 1 : 0),
        wrong_count: existing.wrong_count + (isCorrect ? 0 : 1),
        last_reviewed: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('user_progress').insert({
        user_name: user,
        word_id: wordId,
        correct_count: isCorrect ? 1 : 0,
        wrong_count: isCorrect ? 0 : 1,
      })
    }
  }

  const handleAnswer = async (isCorrect) => {
    await recordProgress(current.id, isCorrect)
    if (isCorrect) setCorrect(c => c + 1)
    else setWrong(w => w + 1)

    if (idx + 1 >= queue.length) {
      setSessionResult({ correct: correct + (isCorrect ? 1 : 0), wrong: wrong + (isCorrect ? 0 : 1), total: queue.length })
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  const restart = () => {
    setQueue(shuffle(words))
    setIdx(0)
    setFlipped(false)
    setCorrect(0)
    setWrong(0)
    setSessionResult(null)
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

  if (sessionResult) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>本次結果</h2></div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {sessionResult.correct / sessionResult.total >= 0.8 ? '🎉' : sessionResult.correct / sessionResult.total >= 0.5 ? '👍' : '💪'}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          {sessionResult.correct} / {sessionResult.total}
        </div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          答對率 {Math.round(sessionResult.correct / sessionResult.total * 100)}%
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          <button className="btn btn-primary btn-full" onClick={restart}>再來一次</button>
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

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: `${(idx / queue.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: '24px 16px' }}>
        {/* Card */}
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
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-error btn-full" style={{ padding: 16, fontSize: 16 }} onClick={() => handleAnswer(false)}>
              ✗ 答錯
            </button>
            <button className="btn btn-success btn-full" style={{ padding: 16, fontSize: 16 }} onClick={() => handleAnswer(true)}>
              ✓ 答對
            </button>
          </div>
        )}

        {/* Score */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          <span>✓ {correct}</span>
          <span>✗ {wrong}</span>
        </div>
      </div>
    </div>
  )
}

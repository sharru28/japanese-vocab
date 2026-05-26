import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function normalize(s) { return (s || '').trim().toLowerCase() }

function checkAnswer(input, meaning) {
  const answers = meaning.split('/').map(a => normalize(a))
  return answers.includes(normalize(input))
}

export default function TypingQuiz({ user, onBack }) {
  const [words, setWords] = useState([])
  const [mode, setMode] = useState(null) // 'jp2cn' | 'cn2jp'
  const [queue, setQueue] = useState([])
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null) // null | 'correct' | 'wrong'
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    supabase.from('words').select('*').then(({ data }) => {
      setWords(data || [])
      setLoading(false)
    })
  }, [])

  const start = (m) => {
    setMode(m)
    setQueue(shuffle(words))
    setIdx(0)
    setInput('')
    setResult(null)
    setCorrect(0)
    setWrong(0)
    setDone(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const current = queue[idx]

  const recordProgress = async (wordId, isCorrect) => {
    const { data: existing } = await supabase
      .from('user_progress')
      .select('id, correct_count, wrong_count')
      .eq('user_name', user).eq('word_id', wordId).single()
    if (existing) {
      await supabase.from('user_progress').update({
        correct_count: existing.correct_count + (isCorrect ? 1 : 0),
        wrong_count: existing.wrong_count + (isCorrect ? 0 : 1),
        last_reviewed: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('user_progress').insert({
        user_name: user, word_id: wordId,
        correct_count: isCorrect ? 1 : 0, wrong_count: isCorrect ? 0 : 1,
      })
    }
  }

  const submit = async () => {
    if (!input.trim() || result) return
    const isCorrect = mode === 'jp2cn'
      ? checkAnswer(input, current.meaning)
      : checkAnswer(input, current.kana) || checkAnswer(input, current.kanji || '')

    setResult(isCorrect ? 'correct' : 'wrong')
    await recordProgress(current.id, isCorrect)
    if (isCorrect) setCorrect(c => c + 1)
    else setWrong(w => w + 1)
  }

  const next = () => {
    if (idx + 1 >= queue.length) { setDone(true); return }
    setIdx(i => i + 1)
    setInput('')
    setResult(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (loading) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>打字測驗</h2></div>
      <div className="empty"><div className="empty-icon">⏳</div>載入中...</div>
    </div>
  )

  if (words.length === 0) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>打字測驗</h2></div>
      <div className="empty"><div className="empty-icon">📭</div>還沒有單字，先去新增吧！</div>
    </div>
  )

  // Mode selection
  if (!mode) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>打字測驗</h2></div>
      <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>選擇測驗方向：</p>
        <button
          className="card"
          style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }}
          onClick={() => start('jp2cn')}
        >
          <div style={{ fontSize: 20, marginBottom: 6 }}>🇯🇵 → 🇹🇼</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>看日文，打中文</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>看到假名，輸入中文意思</div>
        </button>
        <button
          className="card"
          style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' }}
          onClick={() => start('cn2jp')}
        >
          <div style={{ fontSize: 20, marginBottom: 6 }}>🇹🇼 → 🇯🇵</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>看中文，打日文</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>看到中文意思，輸入假名</div>
        </button>
      </div>
    </div>
  )

  // Done
  if (done) return (
    <div>
      <div className="page-header"><button className="back-btn" onClick={onBack}>←</button><h2>本次結果</h2></div>
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {correct / queue.length >= 0.8 ? '🎉' : correct / queue.length >= 0.5 ? '👍' : '💪'}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{correct} / {queue.length}</div>
        <div style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          答對率 {Math.round(correct / queue.length * 100)}%
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          <button className="btn btn-primary btn-full" onClick={() => start(mode)}>再來一次</button>
          <button className="btn btn-ghost btn-full" onClick={() => setMode(null)}>換方向</button>
          <button className="btn btn-ghost btn-full" onClick={onBack}>回首頁</button>
        </div>
      </div>
    </div>
  )

  const prompt = mode === 'jp2cn'
    ? (current.kanji ? `${current.kanji}（${current.kana}）` : current.kana)
    : current.meaning

  const correctAnswer = mode === 'jp2cn' ? current.meaning : current.kana

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>打字測驗</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{idx + 1} / {queue.length}</span>
      </div>

      <div style={{ height: 3, background: 'var(--border)' }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: `${(idx / queue.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: '24px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          {mode === 'jp2cn' ? '這個日文的中文意思是？' : '這個中文的日文假名是？'}
        </div>

        {/* Prompt */}
        <div style={{
          background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)',
          padding: '32px', textAlign: 'center', marginBottom: 20, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{prompt}</div>
          {current.tags && <span className="tag" style={{ marginTop: 12 }}>{current.tags}</span>}
        </div>

        {/* Input */}
        <div style={{ marginBottom: 12 }}>
          <input
            ref={inputRef}
            placeholder={mode === 'jp2cn' ? '輸入中文意思...' : '輸入假名...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') result ? next() : submit() }}
            disabled={!!result}
            style={{
              borderColor: result === 'correct' ? 'var(--success)' : result === 'wrong' ? 'var(--error)' : undefined,
              background: result === 'correct' ? 'var(--success-light)' : result === 'wrong' ? 'var(--error-light)' : undefined,
            }}
          />
        </div>

        {/* Feedback */}
        {result && (
          <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 12, fontSize: 15,
            background: result === 'correct' ? 'var(--success-light)' : 'var(--error-light)',
            color: result === 'correct' ? 'var(--success)' : 'var(--error)',
            fontWeight: 500,
          }}>
            {result === 'correct' ? '✓ 答對了！' : `✗ 正確答案：${correctAnswer}`}
          </div>
        )}

        {!result ? (
          <button className="btn btn-primary btn-full" style={{ padding: 14, fontSize: 16 }} onClick={submit} disabled={!input.trim()}>
            送出答案
          </button>
        ) : (
          <button className="btn btn-secondary btn-full" style={{ padding: 14, fontSize: 16 }} onClick={next}>
            {idx + 1 >= queue.length ? '看結果' : '下一題 →'}
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          <span>✓ {correct}</span>
          <span>✗ {wrong}</span>
        </div>
      </div>
    </div>
  )
}

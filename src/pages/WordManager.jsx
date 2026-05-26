import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

export default function WordManager({ onBack }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editWord, setEditWord] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('words').select('*').order('created_at', { ascending: false })
    setWords(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = words.filter(w =>
    !search || [w.kanji, w.kana, w.meaning, w.tags].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = async (id) => {
    if (!confirm('確定刪除這個單字？')) return
    await supabase.from('words').delete().eq('id', id)
    setWords(ws => ws.filter(w => w.id !== id))
    showToast('已刪除')
  }

  const handleCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const lines = ev.target.result.trim().split('\n').filter(Boolean)
      const rows = lines.map(l => {
        const parts = l.split(',').map(s => s.trim())
        return { kanji: parts[0] || null, kana: parts[1] || '', meaning: parts[2] || '' }
      }).filter(r => r.kana && r.meaning)

      if (rows.length === 0) { showToast('格式錯誤，請檢查 CSV'); return }

      const { error } = await supabase.from('words').insert(rows)
      if (error) { showToast('匯入失敗'); return }
      showToast(`匯入 ${rows.length} 個單字`)
      load()
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div>
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>管理單字 ({words.length})</h2>
        <button className="btn btn-primary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setShowAdd(true)}>
          + 新增
        </button>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <input
          placeholder="搜尋單字、假名、中文..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* CSV import */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>批量匯入：</span>
        <label style={{
          display: 'inline-block', padding: '7px 14px', background: 'var(--border)',
          borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', margin: 0,
        }}>
          選擇 CSV
          <input type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
        </label>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>格式：漢字,假名,中文</span>
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon">⏳</div>載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📭</div>
          {search ? '找不到符合的單字' : '還沒有單字，點右上角新增！'}
        </div>
      ) : (
        <div style={{ padding: '8px 16px' }}>
          {filtered.map(w => (
            <div key={w.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {w.kanji && <span style={{ marginRight: 6 }}>{w.kanji}</span>}
                  <span style={{ color: w.kanji ? 'var(--text-muted)' : 'var(--text)', fontSize: w.kanji ? 14 : 16 }}>
                    {w.kana}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>{w.meaning}</div>
                {w.tags && <span className="tag" style={{ marginTop: 4 }}>{w.tags}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditWord(w)}>編輯</button>
                <button className="btn" style={{ padding: '6px 12px', fontSize: 13, background: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--border)' }} onClick={() => handleDelete(w.id)}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editWord) && (
        <WordForm
          word={editWord}
          onSave={async (data) => {
            if (editWord) {
              await supabase.from('words').update(data).eq('id', editWord.id)
              showToast('已更新')
            } else {
              await supabase.from('words').insert(data)
              showToast('已新增')
            }
            setShowAdd(false)
            setEditWord(null)
            load()
          }}
          onClose={() => { setShowAdd(false); setEditWord(null) }}
        />
      )}

      <Toast msg={toast} />
    </div>
  )
}

function WordForm({ word, onSave, onClose }) {
  const [kanji, setKanji] = useState(word?.kanji || '')
  const [kana, setKana] = useState(word?.kana || '')
  const [meaning, setMeaning] = useState(word?.meaning || '')
  const [tags, setTags] = useState(word?.tags || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!kana.trim() || !meaning.trim()) return
    setSaving(true)
    await onSave({ kanji: kanji.trim() || null, kana: kana.trim(), meaning: meaning.trim(), tags: tags.trim() || null })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 50, padding: '0 0 env(safe-area-inset-bottom)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        padding: '24px 20px 32px', width: '100%', maxWidth: 480,
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>
          {word ? '編輯單字' : '新增單字'}
        </h3>
        <div className="form-group">
          <label>漢字（可空）</label>
          <input placeholder="例：食べる" value={kanji} onChange={e => setKanji(e.target.value)} />
        </div>
        <div className="form-group">
          <label>假名 *</label>
          <input placeholder="例：たべる" value={kana} onChange={e => setKana(e.target.value)} />
        </div>
        <div className="form-group">
          <label>中文意思 *</label>
          <input placeholder="例：吃（可用 / 分隔多個意思）" value={meaning} onChange={e => setMeaning(e.target.value)} />
        </div>
        <div className="form-group">
          <label>標籤（可空）</label>
          <input placeholder="例：動詞、招呼語" value={tags} onChange={e => setTags(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>取消</button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !kana.trim() || !meaning.trim()}>
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

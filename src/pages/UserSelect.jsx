const USERS = ['Sharru', 'Jonathan']

export default function UserSelect({ onSelect }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🌸</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>日文單字複習</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>你是誰？</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 280 }}>
        {USERS.map(name => (
          <button
            key={name}
            className="btn btn-primary btn-full"
            style={{ fontSize: 18, padding: '18px 24px', borderRadius: 16 }}
            onClick={() => onSelect(name)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

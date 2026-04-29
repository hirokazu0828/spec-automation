import { useState } from 'react'

const PASSWORD = import.meta.env.VITE_APP_PASSWORD
if (!PASSWORD) {
  throw new Error('VITE_APP_PASSWORD is not set. Define it in .env (see .env.example).')
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem('authed') === '1'
  })

  if (authed) return <>{children}</>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem('authed', '1')
      setAuthed(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-background-tertiary)',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 360,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: '0.08em', marginBottom: 8 }}>
            GOLF STREET LAB
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            見本帳にアクセスするにはパスワードを入力してください
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="パスワード"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            autoFocus
            style={{
              fontSize: 14, padding: '10px 14px', borderRadius: 8,
              border: error ? '1px solid var(--color-border-danger)' : '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)', outline: 'none',
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--color-text-danger)' }}>
              パスワードが正しくありません
            </div>
          )}
          <button
            type="submit"
            style={{
              fontSize: 14, fontWeight: 500, padding: '10px 0',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--color-text-primary)', color: 'var(--color-background-primary)',
              marginTop: 4,
            }}
          >
            入室する
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'
import { useState, useMemo } from 'react'
import { useAllProcessos } from '@/hooks/useProcessos'
import { X, Bell } from 'lucide-react'

export default function NotificationBanner() {
  const { trabalhista, civil, controles, registro, loading } = useAllProcessos()
  const [dismissed, setDismissed] = useState<number[]>([])

  const upcoming = useMemo(() => {
    if (loading) return []
    const all = [...trabalhista, ...civil, ...controles, ...registro]
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return all.filter(p => {
      if (!p.data_audiencia || dismissed.includes(p.id)) return false
      const d = new Date(p.data_audiencia + 'T00:00:00')
      return d.getTime() === today.getTime() || d.getTime() === tomorrow.getTime()
    }).sort((a, b) => {
      const da = new Date(a.data_audiencia! + 'T00:00:00').getTime()
      const db = new Date(b.data_audiencia! + 'T00:00:00').getTime()
      return da - db
    })
  }, [trabalhista, civil, controles, registro, loading, dismissed])

  if (loading || upcoming.length === 0) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,114,229,0.15), rgba(15,114,229,0.08))',
      border: '1px solid rgba(15,114,229,0.4)',
      borderRadius: 12, padding: '12px 20px',
      marginBottom: 16, animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Bell size={18} color="#0f72e5" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9em', color: '#0f72e5', marginBottom: 8 }}>
            🔔 {upcoming.length === 1 ? '1 audiência' : `${upcoming.length} audiências`} programada{upcoming.length > 1 ? 's' : ''} para hoje ou amanhã
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map(p => {
              const d = new Date(p.data_audiencia! + 'T00:00:00')
              const today = new Date(); today.setHours(0,0,0,0)
              const isToday = d.getTime() === today.getTime()

              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(15,114,229,0.08)', borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.72em', fontWeight: 700,
                      background: isToday ? '#ff5757' : '#0f72e5', color: '#fff',
                    }}>
                      {isToday ? '🔥 HOJE' : '📅 AMANHÃ'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.88em', color: 'var(--text)' }}>
                      {p.empreendimento}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82em' }}>
                      — {p.autor}
                    </span>
                    {p.hora_audiencia && (
                      <span style={{ color: '#0f72e5', fontSize: '0.82em', fontFamily: 'JetBrains Mono, monospace' }}>
                        🕐 {p.hora_audiencia}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setDismissed(prev => [...prev, p.id])}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                    title="Dispensar"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

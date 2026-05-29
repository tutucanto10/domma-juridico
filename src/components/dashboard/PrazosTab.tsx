'use client'
import { useAllProcessos } from '@/hooks/useProcessos'
import { calculateDaysRemaining, getDaysRemainingNumber, formatDate, AREA_LABELS } from '@/lib/utils'
import { Processo } from '@/types'

type WithArea = Processo & { areaLabel: string }

export default function PrazosTab() {
  const { trabalhista, civil, controles, registro, loading } = useAllProcessos()

  if (loading) return (
    <div>
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 6 }} />
      ))}
    </div>
  )

  const all: WithArea[] = [
    ...trabalhista.map(p => ({ ...p, areaLabel: 'Trabalhista' })),
    ...civil.map(p => ({ ...p, areaLabel: 'Civil' })),
    ...controles.map(p => ({ ...p, areaLabel: 'Controles' })),
    ...registro.map(p => ({ ...p, areaLabel: 'Registro' })),
  ].filter(p => p.data_audiencia)
    .sort((a, b) => getDaysRemainingNumber(a.data_audiencia) - getDaysRemainingNumber(b.data_audiencia))

  const today = all.filter(p => getDaysRemainingNumber(p.data_audiencia) === 0)
  const critical = all.filter(p => { const d = getDaysRemainingNumber(p.data_audiencia); return d > 0 && d <= 7 })
  const upcoming = all.filter(p => { const d = getDaysRemainingNumber(p.data_audiencia); return d > 7 && d <= 30 })
  const overdue = all.filter(p => getDaysRemainingNumber(p.data_audiencia) < 0)

  function PrazoRow({ p }: { p: WithArea }) {
    const days = getDaysRemainingNumber(p.data_audiencia)
    const isOverdue = days < 0
    const isToday = days === 0
    const isCritical = days > 0 && days <= 7

    const rowBg = isOverdue ? 'rgba(255,87,87,0.07)'
      : isToday ? 'rgba(255,168,0,0.1)'
      : isCritical ? 'rgba(255,168,0,0.05)'
      : 'transparent'

    const daysColor = isOverdue ? '#ff5757'
      : isToday ? '#ffa800'
      : isCritical ? '#ffa800'
      : '#00d9a3'

    return (
      <tr style={{ background: rowBg }}>
        <td>
          <span style={{
            padding: '4px 10px', borderRadius: 12,
            fontSize: '0.75em', fontWeight: 700,
            background: p.areaLabel === 'Trabalhista' ? 'rgba(233,69,96,0.2)' : 'rgba(0,217,163,0.15)',
            color: p.areaLabel === 'Trabalhista' ? '#0f72e5' : '#00d9a3',
          }}>
            {p.areaLabel}
          </span>
        </td>
        <td style={{ fontWeight: 600 }}>{p.empreendimento || '-'}</td>
        <td style={{ color: '#a0a0a0', fontSize: '0.9em', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.descricao || p.autor || '-'}
        </td>
        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {formatDate(p.data_audiencia)}
          {p.hora_audiencia && (
            <span style={{ display: 'block', fontSize: '0.8em', color: '#0f72e5', marginTop: 2 }}>
              🕐 {p.hora_audiencia}
            </span>
          )}
        </td>
        <td>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 800,
            fontSize: '0.95em', color: daysColor,
          }}>
            {isToday ? '🔥 HOJE' : calculateDaysRemaining(p.data_audiencia)}
          </span>
        </td>
        <td>
          <span style={{
            padding: '4px 10px', borderRadius: 12, fontSize: '0.75em', fontWeight: 700,
          }} className={`status-${p.status === 'Em Andamento' ? 'andamento' : p.status === 'Arquivado' ? 'arquivado' : p.status === 'Vitória' ? 'vitoria' : 'condenacao'}`}>
            {p.status}
          </span>
        </td>
        <td style={{ color: 'var(--text-muted)', fontSize: '0.88em' }}>{p.responsavel || '-'}</td>
        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75em', color: '#a0a0a0' }}>
          {p.processo ? p.processo.slice(0, 12) + '...' : '-'}
        </td>
      </tr>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: '🔥 Hoje', count: today.length, color: '#ffa800' },
          { label: '⚡ Críticos (7d)', count: critical.length, color: '#ff5757' },
          { label: '📅 Próximos (30d)', count: upcoming.length, color: '#ffa800' },
          { label: '❌ Vencidos', count: overdue.length, color: '#ff5757' },
          { label: '✅ Total com Prazo', count: all.length, color: '#00d9a3' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '16px 20px',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78em', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '2em', fontWeight: 800, color: s.color }}>
              {s.count}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
          ⏰ Cronologia de Prazos e Audiências
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Área</th>
                <th>Empreendimento</th>
                <th>Processo/Demanda</th>
                <th>Data Audiência</th>
                <th>Dias Restantes</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Nº Processo</th>
              </tr>
            </thead>
            <tbody>
              {all.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px', color: '#a0a0a0' }}>
                    <div>⏰ Nenhum prazo ou audiência cadastrada.</div>
                    <div style={{ fontSize: '0.85em', marginTop: 8 }}>
                      Adicione uma "Data de Audiência" nos processos para vê-los aqui.
                    </div>
                  </td>
                </tr>
              ) : (
                all.map(p => <PrazoRow key={`${p.area}-${p.id}`} p={p} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

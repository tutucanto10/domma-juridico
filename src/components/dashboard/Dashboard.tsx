'use client'
import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import { useAllProcessos } from '@/hooks/useProcessos'
import { useTheme } from '@/hooks/useTheme'
import { formatMoney, AREA_LABELS } from '@/lib/utils'
import { EMPREENDIMENTOS } from '@/types'
import { TrendingUp, Scale, AlertTriangle, DollarSign, Trophy, Clock } from 'lucide-react'

Chart.register(...registerables)

function StatCard({ label, value, color, icon }: {
  label: string
  value: string | number
  color?: string
  icon?: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--card-gradient)',
      padding: '22px 24px',
      borderRadius: 14,
      border: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.3s, box-shadow 0.3s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
    }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #0f72e5, #00d9a3)',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            color: 'var(--text-muted)', fontSize: '0.78em',
            textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 10,
          }}>{label}</div>
          <div style={{
            fontSize: String(value).length > 12 ? '1.5em' : String(value).length > 8 ? '1.85em' : '2.2em',
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace',
            color: color || 'var(--text)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{value}</div>
        </div>
        {icon && (
          <div style={{
            padding: 10, borderRadius: 10,
            background: 'var(--bg-subtle)',
            color: color || 'var(--text-muted)',
          }}>{icon}</div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { trabalhista, civil, controles, registro, loading } = useAllProcessos()
  const { isDark } = useTheme()
  const statusChartRef = useRef<HTMLCanvasElement>(null)
  const areaChartRef = useRef<HTMLCanvasElement>(null)
  const statusChartInstance = useRef<Chart | null>(null)
  const areaChartInstance = useRef<Chart | null>(null)

  const all = [...trabalhista, ...civil, ...controles, ...registro]

  const stats = {
    total: all.length,
    andamento: all.filter(p => p.status === 'Em Andamento').length,
    vitorias: all.filter(p => p.status === 'Vitória').length,
    condenacoes: all.filter(p => p.status === 'Condenação').length,
    arquivados: all.filter(p => p.status === 'Arquivado').length,
    acordos: all.filter(p => p.status === 'Acordo').length,
    valorTotal: all.reduce((s, p) => s + (p.valor_envolvido || 0), 0),
    valorDesfecho: all.reduce((s, p) => s + (p.valor_desfecho || 0), 0),
    prazosCriticos: all.filter(p => {
      if (!p.data_audiencia) return false
      const days = Math.ceil((new Date(p.data_audiencia).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return days >= 0 && days <= 7
    }).length,
  }

  const textColor = isDark ? '#f5f5f5' : '#1e293b'
  const mutedColor = isDark ? '#a0a0a0' : '#64748b'
  const gridColor = isDark ? 'rgba(42,42,62,0.5)' : 'rgba(200,210,225,0.5)'
  const borderColor = isDark ? '#1a1a2e' : '#ffffff'

  useEffect(() => {
    if (loading) return

    if (statusChartRef.current) {
      statusChartInstance.current?.destroy()
      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Em Andamento', 'Vitória', 'Condenação', 'Acordo'],
          datasets: [{
            data: [stats.andamento, stats.vitorias, stats.condenacoes, stats.acordos],
            backgroundColor: ['#ffa800', '#00d9a3', '#ff5757', '#4a9eff'],
            borderColor: borderColor,
            borderWidth: 3,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: textColor, font: { family: 'Bricolage Grotesque' } } },
          },
          cutout: '65%',
        },
      })
    }

    if (areaChartRef.current) {
      areaChartInstance.current?.destroy()
      areaChartInstance.current = new Chart(areaChartRef.current, {
        type: 'bar',
        data: {
          labels: ['Trabalhista', 'Civil', 'Controles', 'Registro'],
          datasets: [{
            label: 'Processos por Área',
            data: [trabalhista.length, civil.length, controles.length, registro.length],
            backgroundColor: ['rgba(15,114,229,0.7)', 'rgba(0,217,163,0.7)', 'rgba(255,168,0,0.7)', 'rgba(15,52,96,0.9)'],
            borderColor: ['#0f72e5', '#00d9a3', '#ffa800', '#0f3460'],
            borderWidth: 2,
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: mutedColor }, grid: { color: gridColor } },
            y: { ticks: { color: mutedColor }, grid: { color: gridColor }, beginAtZero: true },
          },
        },
      })
    }

    return () => {
      statusChartInstance.current?.destroy()
      areaChartInstance.current?.destroy()
    }
  }, [loading, all.length, isDark])

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 20 }}>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total de Processos" value={stats.total} icon={<Scale size={22} />} />
        <StatCard label="Em Andamento" value={stats.andamento} color="#ffa800" icon={<Clock size={22} />} />
        <StatCard label="Vitórias" value={stats.vitorias} color="#00d9a3" icon={<Trophy size={22} />} />
        <StatCard label="Condenações" value={stats.condenacoes} color="#ff5757" icon={<AlertTriangle size={22} />} />
        <StatCard
          label="Valor da Causa"
          value={formatMoney(stats.valorTotal)}
          color="#ff5757"
          icon={<DollarSign size={22} />}
        />
        <StatCard
          label="Prazos Críticos (7d)"
          value={stats.prazosCriticos}
          color={stats.prazosCriticos > 0 ? '#ff5757' : '#00d9a3'}
          icon={<TrendingUp size={22} />}
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
        <div style={{
          background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 24,
        }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700, fontSize: '1em', color: 'var(--text)' }}>📊 Status dos Processos</h3>
          <canvas ref={statusChartRef} />
        </div>
        <div style={{
          background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 24,
        }}>
          <h3 style={{ marginBottom: 16, fontWeight: 700, fontSize: '1em', color: 'var(--text)' }}>📈 Processos por Área</h3>
          <canvas ref={areaChartRef} />
        </div>
      </div>

      {/* Empreendimentos table */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontWeight: 700, color: 'var(--text)' }}>🏢 Resumo por Empreendimento</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Empreendimento</th>
                <th>Trabalhista</th>
                <th>Civil</th>
                <th>Controles</th>
                <th>Registro</th>
                <th>Total</th>
                <th>Vitórias</th>
                <th>Arquivados</th>
                <th>Condenações</th>
                <th>Valor Desfecho</th>
              </tr>
            </thead>
            <tbody>
              {EMPREENDIMENTOS.map(emp => {
                const isGeral = emp === 'Geral / Todos'
                const trab = isGeral ? trabalhista : trabalhista.filter(p => p.empreendimento === emp)
                const civ = isGeral ? civil : civil.filter(p => p.empreendimento === emp)
                const ctrl = isGeral ? controles : controles.filter(p => p.empreendimento === emp)
                const reg = isGeral ? registro : registro.filter(p => p.empreendimento === emp)
                const combined = [...trab, ...civ, ...ctrl, ...reg]
                const total = combined.length

                if (!isGeral && total === 0) return null

                const vitorias = combined.filter(p => p.status === 'Vitória').length
                const arquivados = combined.filter(p => p.status === 'Arquivado').length
                const condenacoes = combined.filter(p => p.status === 'Condenação').length
                const valorDesfecho = combined.reduce((s, p) => s + (p.valor_desfecho || 0), 0)

                return (
                  <tr key={emp} style={isGeral ? { background: 'rgba(15,114,229,0.06)', fontWeight: 700 } : {}}>
                    <td><strong style={{ color: 'var(--text)' }}>{emp}</strong></td>
                    <td>{trab.length}</td>
                    <td>{civ.length}</td>
                    <td>{ctrl.length}</td>
                    <td>{reg.length}</td>
                    <td><strong>{total}</strong></td>
                    <td style={{ color: '#00d9a3' }}>{vitorias}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{arquivados}</td>
                    <td style={{ color: '#ff5757' }}>{condenacoes}</td>
                    <td style={{ color: valorDesfecho > 0 ? '#ff5757' : 'var(--text)', fontFamily: 'JetBrains Mono' }}>
                      {formatMoney(valorDesfecho)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

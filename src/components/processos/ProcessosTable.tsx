'use client'
import { useState, useMemo, useRef } from 'react'
import { Processo, AreaType } from '@/types'
import { formatMoney, formatDate, calculateDaysRemaining, getStatusBadgeClass, getPrioridadeColor } from '@/lib/utils'
import { useProcessos } from '@/hooks/useProcessos'
import { useAuth } from '@/hooks/useAuth'
import ProcessoModal from './ProcessoModal'
import { Plus, Download, Upload, Search, Trash2, Edit, Eye } from 'lucide-react'

const ITEMS_PER_PAGE = 15

interface Props {
  area: AreaType
  areaLabel: string
  showAutorLabel?: string
}

export default function ProcessosTable({ area, areaLabel, showAutorLabel = 'Autor' }: Props) {
  const { processos, loading, saveProcesso, deleteProcesso } = useProcessos(area)
  const { canDelete, profile } = useAuth()
  const [modal, setModal] = useState<{ open: boolean; processo?: Processo | null }>({ open: false })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPrioridade, setFilterPrioridade] = useState('')
  const [filterEmpreendimento, setFilterEmpreendimento] = useState('')
  const [sortKey, setSortKey] = useState<keyof Processo>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    let result = [...processos]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        (p.empreendimento || '').toLowerCase().includes(q) ||
        (p.autor || '').toLowerCase().includes(q) ||
        (p.descricao || '').toLowerCase().includes(q) ||
        (p.processo || '').includes(q)
      )
    }
    if (filterStatus) result = result.filter(p => p.status === filterStatus)
    if (filterPrioridade) result = result.filter(p => p.prioridade === filterPrioridade)
    if (filterEmpreendimento) result = result.filter(p => p.empreendimento === filterEmpreendimento)

    result.sort((a, b) => {
      const av = (a[sortKey] ?? '') as string
      const bv = (b[sortKey] ?? '') as string
      return sortDir === 'asc' ? av.toString().localeCompare(bv.toString()) : bv.toString().localeCompare(av.toString())
    })

    return result
  }, [processos, search, filterStatus, filterPrioridade, filterEmpreendimento, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handleSort(key: keyof Processo) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function handleDelete(id: number) {
    if (!canDelete()) return alert('Sem permissão para deletar.')
    if (!confirm('Confirmar exclusão?')) return
    await deleteProcesso(id)
  }

  async function handleExport() {
    const { default: XLSX } = await import('xlsx')
    const data = processos.map(p => ({
      'Empreendimento': p.empreendimento,
      'Autor': p.autor,
      'Descrição': p.descricao,
      'Responsável': p.responsavel,
      'Prioridade': p.prioridade,
      'Status': p.status,
      'Nº Processo': p.processo,
      'Valor Envolvido': p.valor_envolvido,
      'Desfecho': p.desfecho,
      'Valor Desfecho': p.valor_desfecho,
      'Data Início': p.data_inicio,
      'Data Audiência': p.data_audiencia,
      'Data Conclusão': p.data_conclusao,
      'Observações': p.observacoes,
      'Tags': p.tags,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, areaLabel)
    XLSX.writeFile(wb, `DOMMA_${areaLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    const { default: XLSX } = await import('xlsx')
    const file = e.target.files[0]
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws)

    for (const row of rows) {
      await saveProcesso({
        empreendimento: row['Empreendimento'] || row['SPE'] || '',
        autor: row['Autor'] || row['Reclamante'] || '',
        descricao: row['Descrição'] || row['Objeto'] || '',
        responsavel: row['Responsável'] || row['Advogado'] || '',
        prioridade: (row['Prioridade'] as any) || 'Média',
        status: (row['Status'] as any) || 'Em Andamento',
        processo: row['Nº Processo'] || row['Processo'] || '',
        valor_envolvido: parseFloat(row['Valor Envolvido'] || '0') || 0,
        desfecho: row['Desfecho'] || '',
        valor_desfecho: parseFloat(row['Valor Desfecho'] || '0') || 0,
        data_inicio: row['Data Início'] || null,
        data_audiencia: row['Data Audiência'] || null,
        data_conclusao: row['Data Conclusão'] || null,
        observacoes: row['Observações'] || '',
        tags: row['Tags'] || '',
      })
    }
    alert(`✅ ${rows.length} processos importados com sucesso!`)
    e.target.value = ''
  }

  const thStyle = (key: keyof Processo) => ({
    cursor: 'pointer',
    userSelect: 'none' as const,
    paddingRight: 24,
    position: 'relative' as const,
  })

  const sortIndicator = (key: keyof Processo) => {
    if (sortKey !== key) return ' ⇅'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  if (loading) return (
    <div>
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8, marginBottom: 6 }} />
      ))}
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar processo, autor, empreendimento..."
              style={{
                width: '100%', padding: '9px 9px 9px 32px',
                background: 'var(--secondary)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontSize: '0.9em',
                outline: 'none', fontFamily: 'Bricolage Grotesque, sans-serif',
              }}
            />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            style={{ padding: '9px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: '0.85em', outline: 'none' }}>
            <option value="">Todos Status</option>
            <option>Em Andamento</option>
            {area === 'controles' ? (
              <option>Concluído</option>
            ) : area === 'trabalhista' ? (
              <><option>Condenação</option><option>Vitória</option><option>Acordo</option></>
            ) : (
              <><option>Arquivado</option><option>Vitória</option><option>Condenação</option></>
            )}
          </select>
          <select value={filterPrioridade} onChange={e => { setFilterPrioridade(e.target.value); setPage(1) }}
            style={{ padding: '9px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: '0.85em', outline: 'none' }}>
            <option value="">Todas Prioridades</option>
            <option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setModal({ open: true, processo: null })} style={{
            padding: '9px 18px',
            background: 'linear-gradient(135deg, #0f72e5, #0a5ec2)',
            border: 'none', borderRadius: 10, color: '#fff',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.9em',
            fontFamily: 'Bricolage Grotesque, sans-serif',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 16px rgba(15,114,229,0.3)',
          }}>
            <Plus size={16} /> Nova Demanda
          </button>
          <button onClick={handleExport} style={{
            padding: '9px 14px', background: 'var(--secondary)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontSize: '0.85em',
            fontFamily: 'Bricolage Grotesque, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Download size={15} /> Excel
          </button>
          <label style={{
            padding: '9px 14px', background: 'var(--secondary)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontSize: '0.85em',
            fontFamily: 'Bricolage Grotesque, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Upload size={15} /> Importar
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Stats summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: filtered.length, color: 'var(--text)' },
          { label: 'Andamento', value: filtered.filter(p => p.status === 'Em Andamento').length, color: '#ffa800' },
          { label: 'Vitórias', value: filtered.filter(p => p.status === 'Vitória').length, color: '#00d9a3' },
          { label: 'Valor da Causa', value: formatMoney(filtered.reduce((s, p) => s + (p.valor_envolvido || 0), 0)), color: '#ff5757' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '6px 14px', background: 'var(--secondary)', border: '1px solid var(--border)',
            borderRadius: 20, fontSize: '0.82em', color: 'var(--text-muted)',
          }}>
            {s.label}: <strong style={{ color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('empreendimento')} style={thStyle('empreendimento')}>
                  Empreendimento{sortIndicator('empreendimento')}
                </th>
                <th onClick={() => handleSort('autor')} style={thStyle('autor')}>
                  {showAutorLabel}{sortIndicator('autor')}
                </th>
                <th>Descrição</th>
                <th onClick={() => handleSort('prioridade')} style={thStyle('prioridade')}>
                  Prioridade{sortIndicator('prioridade')}
                </th>
                <th onClick={() => handleSort('status')} style={thStyle('status')}>
                  Status{sortIndicator('status')}
                </th>
                <th>Nº Processo</th>
                <th onClick={() => handleSort('valor_envolvido')} style={thStyle('valor_envolvido')}>
                  Valor da Causa{sortIndicator('valor_envolvido')}
                </th>
                <th>Desfecho</th>
                <th onClick={() => handleSort('valor_desfecho')} style={thStyle('valor_desfecho')}>
                  Valor Desf.{sortIndicator('valor_desfecho')}
                </th>
                <th>Audiência</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                    <div>
                      <div style={{ fontSize: '2em', marginBottom: 10 }}>⚖️</div>
                      <strong>Nenhuma demanda encontrada</strong>
                      <p style={{ marginTop: 6, fontSize: '0.9em' }}>
                        {search || filterStatus || filterPrioridade
                          ? 'Tente ajustar os filtros'
                          : 'Clique em "Nova Demanda" para cadastrar'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(p => {
                  const daysLeft = p.data_audiencia
                    ? Math.ceil((new Date(p.data_audiencia + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.empreendimento || '-'}
                      </td>
                      <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.autor || '-'}
                      </td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.85em' }}>
                        {p.descricao || '-'}
                      </td>
                      <td>
                        <span className={`priority-${(p.prioridade || 'baixa').toLowerCase()}`} style={{ fontSize: '0.85em', fontWeight: 700 }}>
                          {p.prioridade}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px', borderRadius: 12, fontSize: '0.75em', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }} className={`status-${p.status === 'Em Andamento' ? 'andamento' : p.status === 'Arquivado' ? 'arquivado' : p.status === 'Vitória' ? 'vitoria' : p.status === 'Concluído' ? 'concluido' : p.status === 'Acordo' ? 'acordo' : 'condenacao'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78em', color: 'var(--text-muted)' }}>
                        {p.processo ? p.processo.slice(0, 10) + '...' : '-'}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85em', color: '#ff5757', fontWeight: 600 }}>
                        {formatMoney(p.valor_envolvido)}
                      </td>
                      <td style={{ fontSize: '0.85em', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.desfecho || '-'}
                      </td>
                      <td style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85em',
                        color: (p.valor_desfecho || 0) > 0 ? '#0f72e5' : 'var(--text-muted)',
                      }}>
                        {formatMoney(p.valor_desfecho)}
                      </td>
                      <td style={{
                        fontSize: '0.82em', fontWeight: 600,
                        color: daysLeft !== null
                          ? daysLeft < 0 ? '#ff5757' : daysLeft <= 7 ? '#ffa800' : '#00d9a3'
                          : '#a0a0a0',
                      }}>
                        {p.data_audiencia ? calculateDaysRemaining(p.data_audiencia) : '-'}
                        {p.hora_audiencia && (
                          <span style={{ display: 'block', fontSize: '0.75em', color: '#0f72e5', fontWeight: 400 }}>
                            {p.hora_audiencia}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => setModal({ open: true, processo: p })}
                            title="Editar"
                            style={{
                              padding: '5px 9px', background: 'var(--secondary)', border: '1px solid var(--border)',
                              borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
                              transition: 'all 0.2s',
                            }}
                          ><Edit size={13} /></button>
                          {canDelete() && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              title="Deletar"
                              style={{
                                padding: '5px 9px', background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)',
                                borderRadius: 6, cursor: 'pointer', color: '#ff5757',
                              }}
                            ><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)', flexWrap: 'wrap',
          }}>
            <button onClick={() => setPage(1)} disabled={page === 1}
              style={{ padding: '6px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
              «
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    background: p === page ? 'linear-gradient(135deg, #0f72e5, #0a5ec2)' : 'var(--secondary)',
                    border: `1px solid ${p === page ? '#0f72e5' : 'var(--border)'}`,
                    color: 'var(--text)', fontWeight: p === page ? 700 : 400,
                  }}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
              ›
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              style={{ padding: '6px 10px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
              »
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82em' }}>
              {filtered.length} resultados · Página {page}/{totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <ProcessoModal
          area={area}
          processo={modal.processo}
          onClose={() => setModal({ open: false })}
          onSave={saveProcesso}
        />
      )}
    </div>
  )
}

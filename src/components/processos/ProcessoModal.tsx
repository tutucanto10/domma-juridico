'use client'
import { useState, useEffect } from 'react'
import { Processo, AreaType, EMPREENDIMENTOS, CHECKLISTS, Comentario } from '@/types'
import { formatDate, formatMoney } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getComentarios, addComentario, getAuditLogs } from '@/hooks/useProcessos'
import { useAuth } from '@/hooks/useAuth'
import { X, Send, History, FileText, Upload, Trash2 } from 'lucide-react'

interface Props {
  area: AreaType
  processo?: Processo | null
  onClose: () => void
  onSave: (data: Partial<Processo>) => Promise<Processo | null>
}

type ModalTab = 'dados' | 'documentos' | 'comentarios' | 'auditoria'

const AREA_LABEL: Record<AreaType, string> = {
  trabalhista: 'Trabalhista',
  civil: 'Civil',
  controles: 'Controles Internos',
  registro: 'Registro',
}

export default function ProcessoModal({ area, processo, onClose, onSave }: Props) {
  const { user, profile } = useAuth()
  const isNew = !processo?.id
  const [activeTab, setActiveTab] = useState<ModalTab>('dados')
  const [saving, setSaving] = useState(false)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [newComment, setNewComment] = useState('')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const defaultStatus = area === 'trabalhista' ? 'Condenação' : area === 'controles' ? 'Em Andamento' : 'Em Andamento'

  const [form, setForm] = useState<Partial<Processo>>({
    empreendimento: '',
    autor: '',
    descricao: '',
    responsavel: '',
    prioridade: 'Média',
    status: defaultStatus,
    processo: '',
    valor_envolvido: 0,
    desfecho: '',
    valor_desfecho: 0,
    data_inicio: '',
    data_conclusao: '',
    data_audiencia: '',
    observacoes: '',
    tags: '',
    documentos: '',
    ...processo,
  })

  useEffect(() => {
    if (processo?.id) {
      loadComentarios()
      loadAuditLogs()
      loadAttachments()
      // Load checklist from documentos field
      try {
        const parsed = JSON.parse(processo.documentos || '{}')
        if (typeof parsed === 'object' && !Array.isArray(parsed)) setChecklist(parsed)
      } catch {}
    }
  }, [processo?.id])

  async function loadComentarios() {
    if (!processo?.id) return
    const data = await getComentarios(processo.id)
    setComentarios(data)
  }

  async function loadAuditLogs() {
    if (!processo?.id) return
    const data = await getAuditLogs(processo.id)
    setAuditLogs(data)
  }

  async function loadAttachments() {
    if (!processo?.id) return
    const { data } = await supabase
      .from('documentos_anexos')
      .select('*')
      .eq('processo_id', processo.id)
      .order('created_at', { ascending: false })
    setAttachments(data || [])
  }

  const [saveError, setSaveError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = {
      ...form,
      documentos: JSON.stringify(checklist),
    }
    try {
      const result = await onSave(payload)
      setSaving(false)
      if (result) {
        onClose()
      } else {
        setSaveError('Erro ao salvar. Tente novamente.')
      }
    } catch (err: unknown) {
      setSaving(false)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao salvar'
      setSaveError(msg)
      console.error('[ProcessoModal] Erro ao salvar:', err)
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !user || !processo?.id) return
    const c = await addComentario(processo.id, user.id, profile?.full_name || user.email || 'Usuário', newComment)
    if (c) { setComentarios(prev => [...prev, c]); setNewComment('') }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length || !user || !processo?.id) return
    setUploadingDoc(true)
    const file = e.target.files[0]
    const path = `processos/${processo.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('documentos-processos')
      .upload(path, file)

    if (!uploadError) {
      await supabase.from('documentos_anexos').insert({
        processo_id: processo.id,
        user_id: user.id,
        nome: file.name,
        storage_path: path,
        tamanho: file.size,
        tipo: file.type,
      })
      loadAttachments()
    }
    setUploadingDoc(false)
  }

  async function handleDeleteAttachment(att: any) {
    await supabase.storage.from('documentos-processos').remove([att.storage_path])
    await supabase.from('documentos_anexos').delete().eq('id', att.id)
    loadAttachments()
  }

  const checklistItems = CHECKLISTS[area] || []
  const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: 'var(--secondary)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)',
    fontSize: '0.9em', outline: 'none',
    fontFamily: 'Bricolage Grotesque, sans-serif',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    display: 'block', color: 'var(--text-muted)',
    fontSize: '0.78em', textTransform: 'uppercase' as const,
    letterSpacing: 1, marginBottom: 6, fontWeight: 600,
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: 20,
        border: '1px solid var(--border)',
        width: '95%', maxWidth: 1100, height: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        animation: 'fadeIn 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.1em' }}>
            {isNew ? `➕ Nova Demanda — ${AREA_LABEL[area]}` : `✏️ Editar Demanda — ${AREA_LABEL[area]}`}
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,87,87,0.1)', border: '1px solid rgba(255,87,87,0.2)',
            borderRadius: 8, color: '#ff5757', cursor: 'pointer', padding: '6px 10px',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body: 70% form + 30% comments */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LEFT: Main form */}
          <div style={{ flex: 7, overflow: 'auto', padding: '24px 28px', borderRight: '1px solid var(--border)' }}>
            {/* Modal tabs */}
            <div style={{
              display: 'flex', gap: 4, borderBottom: '2px solid var(--border)',
              marginBottom: 24, position: 'sticky', top: 0, background: 'var(--card)', zIndex: 5, paddingBottom: 0,
            }}>
              {(['dados', 'documentos', 'auditoria'] as ModalTab[]).map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '10px 18px',
                  background: 'none', border: 'none',
                  borderBottom: `3px solid ${activeTab === t ? '#0f72e5' : 'transparent'}`,
                  color: activeTab === t ? '#0f72e5' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.9em', fontWeight: 600,
                  fontFamily: 'Bricolage Grotesque, sans-serif',
                  transition: 'color 0.2s',
                }}>
                  {t === 'dados' && '📝 Dados'}
                  {t === 'documentos' && '📎 Documentos'}
                  {t === 'auditoria' && '🔍 Auditoria'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave}>
              {/* TAB: DADOS */}
              {activeTab === 'dados' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Empreendimento */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Empreendimento/SPE</label>
                    <select
                      value={form.empreendimento || ''}
                      onChange={e => setForm(f => ({ ...f, empreendimento: e.target.value }))}
                      required style={inputStyle}
                    >
                      <option value="">Selecione...</option>
                      {EMPREENDIMENTOS.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>{area === 'civil' ? 'Autor/Réu' : 'Autor'}</label>
                    <input value={form.autor || ''} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))}
                      required style={inputStyle} placeholder="Nome completo" />
                  </div>

                  <div>
                    <label style={labelStyle}>Responsável</label>
                    <input value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                      style={inputStyle} placeholder="Advogado responsável" />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Descrição do Caso</label>
                    <textarea value={form.descricao || ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                      rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Breve descrição..." />
                  </div>

                  <div>
                    <label style={labelStyle}>Prioridade</label>
                    <select value={form.prioridade || 'Média'} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as any }))}
                      style={inputStyle}>
                      <option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={form.status || 'Em Andamento'} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                      style={inputStyle}>
                      {area === 'controles' ? (
                        <><option>Em Andamento</option><option>Concluído</option></>
                      ) : area === 'trabalhista' ? (
                        <><option>Condenação</option><option>Vitória</option><option>Acordo</option></>
                      ) : (
                        <><option>Em Andamento</option><option>Arquivado</option><option>Vitória</option><option>Condenação</option></>
                      )}
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Nº do Processo (20 dígitos)</label>
                    <input value={form.processo || ''} onChange={e => setForm(f => ({ ...f, processo: e.target.value }))}
                      style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
                      placeholder="00000000000000000000" maxLength={25} />
                  </div>

                  <div>
                    <label style={labelStyle}>💰 Valor Envolvido</label>
                    <input type="number" step="0.01" value={form.valor_envolvido || ''} min={0}
                      onChange={e => setForm(f => ({ ...f, valor_envolvido: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle} placeholder="0,00" />
                  </div>

                  <div>
                    <label style={labelStyle}>Desfecho</label>
                    <input value={form.desfecho || ''} onChange={e => setForm(f => ({ ...f, desfecho: e.target.value }))}
                      style={inputStyle} placeholder="Ex: Acordo, Improcedente..." />
                  </div>

                  <div>
                    <label style={labelStyle}>💰 Valor do Desfecho</label>
                    <input type="number" step="0.01" value={form.valor_desfecho || ''} min={0}
                      onChange={e => setForm(f => ({ ...f, valor_desfecho: parseFloat(e.target.value) || 0 }))}
                      style={inputStyle} placeholder="0,00" />
                  </div>

                  <div>
                    <label style={labelStyle}>Data Início</label>
                    <input type="date" value={form.data_inicio?.slice(0, 10) || ''}
                      onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                      style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>Data de Audiência</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="date" value={form.data_audiencia?.slice(0, 10) || ''}
                        onChange={e => setForm(f => ({ ...f, data_audiencia: e.target.value }))}
                        style={{ ...inputStyle, flex: 2 }} />
                      <input type="time" value={form.hora_audiencia || ''}
                        onChange={e => setForm(f => ({ ...f, hora_audiencia: e.target.value }))}
                        style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Data Conclusão</label>
                    <input type="date" value={form.data_conclusao?.slice(0, 10) || ''}
                      onChange={e => setForm(f => ({ ...f, data_conclusao: e.target.value }))}
                      style={inputStyle} />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Tags (separe por vírgula)</label>
                    <input value={form.tags || ''} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      style={inputStyle} placeholder="recurso, urgente, acordo..." />
                    {tags.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Observações</label>
                    <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                      rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {/* TAB: DOCUMENTOS */}
              {activeTab === 'documentos' && (
                <div>
                  {/* Checklist */}
                  {checklistItems.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <h4 style={{ marginBottom: 16, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', letterSpacing: 1 }}>
                        ☑️ Checklist de Documentos ({area})
                      </h4>
                      {checklistItems.map(item => (
                        <label key={item} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', marginBottom: 6,
                          background: checklist[item] ? 'rgba(0,217,163,0.08)' : 'var(--secondary)',
                          borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${checklist[item] ? 'rgba(0,217,163,0.3)' : 'var(--border)'}`,
                          transition: 'all 0.2s',
                        }}>
                          <input type="checkbox" checked={!!checklist[item]}
                            onChange={e => setChecklist(c => ({ ...c, [item]: e.target.checked }))}
                            style={{ accentColor: '#00d9a3', width: 16, height: 16 }} />
                          <span style={{ color: checklist[item] ? '#00d9a3' : 'var(--text)', fontSize: '0.9em' }}>
                            {checklist[item] ? '✓ ' : ''}{item}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* File uploads */}
                  {!isNew && (
                    <div>
                      <h4 style={{ marginBottom: 16, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85em', letterSpacing: 1 }}>
                        📎 Arquivos Anexados
                      </h4>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '14px 20px', marginBottom: 16,
                        border: '2px dashed var(--border)', borderRadius: 10,
                        cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
                      }}>
                        <Upload size={20} />
                        <span>{uploadingDoc ? 'Enviando...' : 'Clique para anexar um PDF ou documento'}</span>
                        <input type="file" onChange={handleFileUpload} disabled={uploadingDoc}
                          accept=".pdf,.doc,.docx,.png,.jpg" style={{ display: 'none' }} />
                      </label>
                      {attachments.map(att => (
                        <div key={att.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', background: 'var(--secondary)', borderRadius: 8,
                          marginBottom: 6, border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={16} color="#0f72e5" />
                            <span style={{ fontSize: '0.85em' }}>{att.nome}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75em' }}>
                              {att.tamanho ? `(${(att.tamanho / 1024).toFixed(0)} KB)` : ''}
                            </span>
                          </div>
                          <button type="button" onClick={() => handleDeleteAttachment(att)}
                            style={{ background: 'none', border: 'none', color: '#ff5757', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {attachments.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: 20 }}>
                          Nenhum arquivo anexado ainda.
                        </p>
                      )}
                    </div>
                  )}
                  {isNew && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: 20 }}>
                      💡 Salve o processo primeiro para poder anexar arquivos.
                    </p>
                  )}
                </div>
              )}

              {/* TAB: AUDITORIA */}
              {activeTab === 'auditoria' && (
                <div>
                  <h4 style={{ marginBottom: 16, fontWeight: 700 }}>🔍 Histórico de Alterações</h4>
                  {auditLogs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Nenhuma alteração registrada.</p>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} style={{
                        padding: '12px 16px', marginBottom: 8,
                        background: 'var(--secondary)', borderRadius: 8,
                        borderLeft: '3px solid #0f72e5',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <strong style={{ color: '#0f72e5', fontSize: '0.85em' }}>{log.user_name}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78em' }}>
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85em', color: '#a0a0a0' }}>{log.campo}: </span>
                        <span style={{ fontSize: '0.85em', color: '#ff5757', textDecoration: 'line-through', marginRight: 6 }}>{log.valor_anterior || '—'}</span>
                        <span style={{ fontSize: '0.85em', color: '#a0a0a0' }}>→ </span>
                        <span style={{ fontSize: '0.85em', color: '#00d9a3' }}>{log.valor_novo}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Save error */}
              {saveError && (
                <div style={{
                  background: 'rgba(255,87,87,0.15)', border: '1px solid rgba(255,87,87,0.4)',
                  borderRadius: 8, padding: '10px 14px', marginTop: 16, color: '#ff5757', fontSize: '0.85em',
                }}>
                  ⚠️ {saveError}
                </div>
              )}

              {/* Submit */}
              <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} style={{
                  padding: '11px 24px', background: 'var(--secondary)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
                  fontFamily: 'Bricolage Grotesque, sans-serif',
                }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{
                  padding: '11px 28px',
                  background: saving ? 'var(--border)' : 'linear-gradient(135deg, #0f72e5, #0a5ec2)',
                  border: 'none', borderRadius: 10,
                  color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontFamily: 'Bricolage Grotesque, sans-serif',
                  boxShadow: saving ? 'none' : '0 4px 20px rgba(15,114,229,0.4)',
                }}>
                  {saving ? '⏳ Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: Comments sidebar */}
          <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: 8 }}>
                💬 Comentários
                {comentarios.length > 0 && (
                  <span style={{
                    background: '#0f72e5', color: 'white',
                    width: 20, height: 20, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7em', fontWeight: 700,
                  }}>{comentarios.length}</span>
                )}
              </h4>
            </div>

            {/* Comments list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {isNew ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: 20 }}>
                  Salve o processo para adicionar comentários.
                </p>
              ) : comentarios.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: 20 }}>
                  Nenhum comentário ainda.
                </p>
              ) : (
                comentarios.map(c => (
                  <div key={c.id} style={{
                    padding: '10px 12px', marginBottom: 10,
                    background: 'var(--secondary)', borderRadius: 8,
                    borderLeft: '3px solid #0f72e5',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ color: '#0f72e5', fontSize: '0.8em' }}>{c.user_name}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>
                        {new Date(c.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85em', lineHeight: 1.5, margin: 0 }}>{c.texto}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            {!isNew && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2a3e', flexShrink: 0 }}>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: 'var(--secondary)', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text)',
                    fontSize: '0.85em', resize: 'none', outline: 'none',
                    fontFamily: 'Bricolage Grotesque, sans-serif',
                    marginBottom: 8,
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment() }}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  style={{
                    width: '100%', padding: '9px',
                    background: newComment.trim() ? 'linear-gradient(135deg, #0f72e5, #0a5ec2)' : 'var(--border)',
                    border: 'none', borderRadius: 8,
                    color: '#fff', cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600, fontSize: '0.85em',
                    fontFamily: 'Bricolage Grotesque, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Send size={14} /> Enviar (Ctrl+Enter)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

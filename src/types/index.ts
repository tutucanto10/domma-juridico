export type UserRole = 'ti' | 'diretoria' | 'juridico' | 'advogada_terceirizada'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export type AreaType = 'trabalhista' | 'civil' | 'controles' | 'registro'

export type PrioridadeType = 'Baixa' | 'Média' | 'Alta' | 'Urgente'

export type StatusType = 'Em Andamento' | 'Arquivado' | 'Vitória' | 'Condenação' | 'Concluído' | 'Acordo'

export interface Processo {
  id: number
  area: AreaType
  user_id: string
  empreendimento: string
  autor: string
  descricao: string
  responsavel: string
  prioridade: PrioridadeType
  status: StatusType
  processo: string
  valor_envolvido: number
  desfecho: string
  valor_desfecho: number
  data_inicio: string | null
  data_conclusao: string | null
  data_audiencia: string | null
  hora_audiencia: string | null
  observacoes: string
  tags: string
  documentos: string
  created_at: string
  updated_at: string
}

export interface Comentario {
  id: number
  processo_id: number
  user_id: string
  user_name: string
  texto: string
  created_at: string
}

export interface AuditLog {
  id: number
  processo_id: number
  user_id: string
  user_name: string
  campo: string
  valor_anterior: string
  valor_novo: string
  created_at: string
}

export interface DocumentoAnexo {
  id: string
  processo_id: number
  user_id: string
  nome: string
  url: string
  tamanho: number
  tipo: string
  created_at: string
}

export const EMPREENDIMENTOS = [
  'Unic Primavera',
  'Prime Caxias',
  'Seleto Primavera',
  'Reserva Equitativa',
  'Liv Primavera',
  'Rosario 2',
  'Rosario 3',
  'Unic São Gonçalo',
  'Inhauma',
  'Clube Maua',
  'Amorim e Rego',
  'Domma Incorporações',
  'VES',
  'Geral / Todos',
] as const

export const CHECKLISTS: Record<string, string[]> = {
  civil: [
    'Petição inicial',
    'Contestação',
    'Réplica',
    'Laudos periciais',
    'Documentos do imóvel',
    'Habite-se / Alvará',
    'Contrato de compra e venda',
    'Procuração',
    'Certidão de distribuição',
  ],
  trabalhista: [
    'CTPS',
    'Rescisão contratual',
    'Guias FGTS',
    'Extratos bancários',
    'Folhas de ponto',
    'Contracheques',
    'Exame admissional / demissional',
    'Procuração',
    'Notificações / Comunicados',
  ],
  controles: [
    'Contrato',
    'Aditivo contratual',
    'Relatório de status',
    'Comprovantes de pagamento',
    'Notificações extrajudiciais',
  ],
  registro: [
    'Matrícula do imóvel',
    'Certidão de ônus reais',
    'Registro de incorporação',
    'Memorial descritivo',
    'Habite-se',
    'Alvará de funcionamento',
  ],
}

export type TabType = 'dashboard' | 'trabalhista' | 'civil' | 'controles' | 'registro' | 'prazos' | 'usuarios'

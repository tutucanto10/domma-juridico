'use client'
import { useState } from 'react'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import NotificationBanner from '@/components/NotificationBanner'
import LoginScreen from '@/components/auth/LoginScreen'
import Header from '@/components/layout/Header'
import Dashboard from '@/components/dashboard/Dashboard'
import ProcessosTable from '@/components/processos/ProcessosTable'
import PrazosTab from '@/components/dashboard/PrazosTab'
import UsuariosTab from '@/components/dashboard/UsuariosTab'
import { TabType } from '@/types'

function AppContent() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border)',
          borderTopColor: '#0f72e5', borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>Carregando sistema...</p>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 20px' }}>
        <Header activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Notification banner — audiências de hoje e amanhã */}
        <NotificationBanner />

        {/* Tab content */}
        {activeTab === 'dashboard' && <Dashboard />}

        {activeTab === 'trabalhista' && (
          <ProcessosTable
            area="trabalhista"
            areaLabel="Trabalhista"
            showAutorLabel="Reclamante"
          />
        )}

        {activeTab === 'civil' && (
          <ProcessosTable
            area="civil"
            areaLabel="Civil"
            showAutorLabel="Autor/Réu"
          />
        )}

        {activeTab === 'controles' && (
          <ProcessosTable
            area="controles"
            areaLabel="Controles Internos"
            showAutorLabel="Parte"
          />
        )}

        {activeTab === 'registro' && (
          <ProcessosTable
            area="registro"
            areaLabel="Registro"
            showAutorLabel="Requerente"
          />
        )}

        {activeTab === 'prazos' && <PrazosTab />}

        {activeTab === 'usuarios' && <UsuariosTab />}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  )
}

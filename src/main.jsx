import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'

// Lazy load the heavy Privy provider and App together
// This defers all wallet/auth code until after initial paint
const LazyApp = lazy(() => import('./LazyApp.jsx'));

// Minimal loading spinner for fast FCP
const AppLoader = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif'
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#ef4444',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <span style={{ fontSize: '14px', opacity: 0.7, letterSpacing: '0.1em' }}>LOADING...</span>
    </div>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<AppLoader />}>
      <LazyApp />
    </Suspense>
  </StrictMode>,
)

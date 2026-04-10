import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PricingProvider } from './lib/PricingProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PricingProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PricingProvider>
  </StrictMode>,
)

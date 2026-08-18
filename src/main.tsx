import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './components/FadingHall.css'
import './components/GrottoHub.css'
import './components/KnowledgeGraphModal.css'
import './components/LiteratureLibrary.css'
import './components/ColorCard.css'
import './components/agent/GlobalAgent.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

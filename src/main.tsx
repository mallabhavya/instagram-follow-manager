import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Popup from './popup/pages/Popup'
import './popup/popup.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Popup root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
)

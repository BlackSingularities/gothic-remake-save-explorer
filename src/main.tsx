import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { initFeedback } from './lib/feedback.js'
import { currentLanguage } from './i18n/tr'

initFeedback({
  app: 'gothic-save-explorer',
  appName: 'Gothic Remake Save Explorer',
  version: () => window.gothic?.appVersion() ?? '',
  lang: () => currentLanguage(),
  platform: 'windows',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

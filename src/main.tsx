import { createRoot } from 'react-dom/client'
import './index.css'
import ChatApp from './ChatApp.tsx'

createRoot(document.getElementById('root')!).render(
  <ChatApp />
)

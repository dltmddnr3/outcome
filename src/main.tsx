import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OutcomeApp } from './OutcomeApp'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><OutcomeApp /></StrictMode>)

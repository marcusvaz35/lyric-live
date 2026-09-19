import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LiveApp />
  </React.StrictMode>
)

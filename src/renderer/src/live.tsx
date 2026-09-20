import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveApp from './LiveApp'
import './styles/globals.css'
import '@fontsource/anton/400.css'
import '@fontsource/bebas-neue/400.css'
import '@fontsource/permanent-marker/400.css'
import '@fontsource/caveat-brush/400.css'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/montserrat/900.css'
import '@fontsource/playfair-display/700-italic.css'


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LiveApp />
  </React.StrictMode>
)

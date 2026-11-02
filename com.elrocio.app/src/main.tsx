import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom' // <-- CAMBIO AQUÍ
import App from './App'
import Carrito from './Carrito'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter> {/* <-- CAMBIO AQUÍ */}
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/carrito" element={<Carrito />} />
      </Routes>
    </HashRouter> {/* <-- CAMBIO AQUÍ */}
  </React.StrictMode>,
)
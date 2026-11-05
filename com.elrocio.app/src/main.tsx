import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Carrito from './Carrito'
import Historial from './Historial'
import Caja from './Caja' // <-- IMPORTAMOS EL NUEVO COMPONENTE
import './index.css'
import Gastos from './Gastos';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/gastos" element={<Gastos />} />
        <Route path="/caja" element={<Caja />} /> {/* <-- NUEVA RUTA */}
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
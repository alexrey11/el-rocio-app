import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const IconMoney = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-.6-1.3-.9-2.4-.9-1.4 0-2.3.7-2.3 1.7 0 2.7 5 1.2 5 4 0 1-.9 1.7-2.4 1.7-1.1 0-2-.3-2.6-1M12 6.8v10.4" /></svg>;

const getTodayLocalString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const money = (value: number) => `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;

export default function Caja() {
    const navigate = useNavigate();
    const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('dia');
    const [fecha, setFecha] = useState<string>(getTodayLocalString());

    // Obtener datos
    const data = useLiveQuery(async () => {
        try {
            const sales = await db.sales.toArray();
            const wastes = await db.wastes.toArray();

            const filtrarPorFecha = (registro: any) => {
                if (periodo === 'dia') return registro.date.startsWith(fecha);
                if (periodo === 'semana') {
                    const d = new Date(registro.date);
                    const f = new Date(fecha);
                    const diff = Math.abs(d.getTime() - f.getTime());
                    return diff <= 7 * 24 * 60 * 60 * 1000;
                }
                if (periodo === 'mes') return registro.date.startsWith(fecha.substring(0, 7));
                return true;
            };

            return {
                ventas: sales.filter(filtrarPorFecha).reverse(),
                mermas: wastes.filter(filtrarPorFecha).reverse()
            };
        } catch (error) {
            return { ventas: [], mermas: [] };
        }
    }, [periodo, fecha]);

    const ventas = data?.ventas || [];
    const mermas = data?.mermas || [];

    // Cálculos
    const ingresosTotales = ventas.reduce((sum, v) => sum + v.total, 0);
    const gananciaBruta = ventas.reduce((sum, v) => sum + v.profit, 0);
    const totalMermas = mermas.reduce((sum, m) => sum + m.costLost, 0);
    const gananciaNetaReal = gananciaBruta - totalMermas;

    const formatHora = (iso: string) => new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });

    // Estilo común para los inputs del header
    const inputStyle = {
        padding: '10px 15px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: 'bold',
        color: '#2e7d32',
        backgroundColor: 'white',
        fontSize: '1rem',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        outline: 'none',
        cursor: 'pointer'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>

            {/* HEADER CORREGIDO */}
            <header className="topbar" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between', // Separa el título de los filtros
                gap: '15px',
                padding: '15px 20px',
                flexWrap: 'wrap'
            }}>

                {/* Botón Volver y Título */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <IconBack />
                    </button>
                    <h1 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                        <IconMoney /> Cierre de Caja
                    </h1>
                </div>

                {/* Filtros de Fecha (Con estilos corregidos) */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value as any)}
                        style={inputStyle}
                    >
                        <option value="dia">Hoy / Día</option>
                        <option value="semana">Esta Semana</option>
                        <option value="mes">Este Mes</option>
                    </select>

                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </header>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
                <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '12px', border: '1px solid #bbdefb' }}>
                    <span style={{ fontSize: '0.85rem', color: '#1565c0', fontWeight: 'bold' }}>INGRESOS TOTALES</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#0d47a1', marginTop: '5px' }}>{money(ingresosTotales)}</div>
                </div>
                <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '12px', border: '1px solid #c8e6c9' }}>
                    <span style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold' }}>GANANCIA BRUTA</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1b5e20', marginTop: '5px' }}>{money(gananciaBruta)}</div>
                </div>
                <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '12px', border: '1px solid #ffcdd2' }}>
                    <span style={{ fontSize: '0.85rem', color: '#c62828', fontWeight: 'bold' }}>PÉRDIDAS (MERMAS)</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#b71c1c', marginTop: '5px' }}>-{money(totalMermas)}</div>
                </div>
                <div style={{ backgroundColor: '#fff3e0', padding: '15px', borderRadius: '12px', border: '2px solid #ffb74d' }}>
                    <span style={{ fontSize: '0.85rem', color: '#e65100', fontWeight: 'bold' }}>GANANCIA NETA REAL</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#bf360c', marginTop: '5px' }}>{money(gananciaNetaReal)}</div>
                </div>
            </div>

            {/* DETALLES EN 2 COLUMNAS */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>

                {/* LISTA DE VENTAS */}
                <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa', borderRadius: '12px 12px 0 0' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>🛒 Ventas ({ventas.length})</h2>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {ventas.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No hay ventas en este período.</p>
                        ) : (
                            ventas.map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <div>
                                        <strong style={{ display: 'block', color: '#333' }}>{v.productName}</strong>
                                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{formatHora(v.date)} • {v.quantity} {v.unit} • {v.moduleId}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ color: '#2e7d32' }}>{money(v.total)}</strong>
                                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#1565c0' }}>Ganancia: {money(v.profit)}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* LISTA DE MERMAS */}
                <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#fff5f5', borderRadius: '12px 12px 0 0' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#c62828' }}>📉 Mermas ({mermas.length})</h2>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                        {mermas.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No hay mermas en este período.</p>
                        ) : (
                            mermas.map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <div>
                                        <strong style={{ display: 'block', color: '#333' }}>{m.productName}</strong>
                                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{formatHora(m.date)} • {m.quantity} {m.unit} • {m.moduleId}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ color: '#c62828' }}>-{money(m.costLost)}</strong>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
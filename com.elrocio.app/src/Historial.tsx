import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

// Iconos
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;

const getTodayLocalString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const money = (value: number) => `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;

export default function Historial() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'ventas' | 'mermas'>('ventas');
    const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalString());

    // Consulta corregida: Traemos TODO y filtramos en JS (es infalible para fechas)
    const registros = useLiveQuery(async () => {
        try {
            const sales = await db.sales.toArray();
            const wastes = await db.wastes.toArray();

            // Filtramos por el día seleccionado (comparando los primeros 10 caracteres "YYYY-MM-DD")
            const salesDia = sales.filter(s => s.date.startsWith(selectedDate)).reverse();
            const wastesDia = wastes.filter(w => w.date.startsWith(selectedDate)).reverse();

            return { sales: salesDia, wastes: wastesDia };
        } catch (error) {
            console.error("Error al cargar registros:", error);
            return { sales: [], wastes: [] };
        }
    }, [selectedDate]);

    // Valores seguros por si la BD demora en cargar
    const ventas = registros?.sales || [];
    const mermas = registros?.wastes || [];

    const totalVentas = useMemo(() => ventas.reduce((sum, v) => sum + v.total, 0), [ventas]);
    const gananciaVentas = useMemo(() => ventas.reduce((sum, v) => sum + v.profit, 0), [ventas]);
    const perdidaMermas = useMemo(() => mermas.reduce((sum, m) => sum + m.costLost, 0), [mermas]);

    const formatHora = (isoString: string) => {
        if (!isoString) return "--:--";
        return new Date(isoString).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });
    };

    const eliminarRegistro = async (id: number, tipo: 'venta' | 'merma') => {
        if (window.confirm('¿Estás seguro de eliminar este registro?')) {
            if (tipo === 'venta') await db.sales.delete(id);
            else await db.wastes.delete(id);
        }
    };

    return (
        <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>

            {/* HEADER */}
            <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', backgroundColor: '#2e7d32', color: 'white' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <IconBack />
                </button>
                <div className="brand-lockup" style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Constancias del Día</h1>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold', color: '#333' }}
                />
            </header>

            {/* TARJETAS DE RESUMEN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
                <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>Total Vendido</span>
                    <h3 style={{ margin: '5px 0 0 0', color: '#2e7d32', fontSize: '1.5rem' }}>{money(totalVentas)}</h3>
                </div>
                <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>Ganancia Neta</span>
                    <h3 style={{ margin: '5px 0 0 0', color: '#1565c0', fontSize: '1.5rem' }}>{money(gananciaVentas)}</h3>
                </div>
                <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>Pérdida (Mermas)</span>
                    <h3 style={{ margin: '5px 0 0 0', color: '#c62828', fontSize: '1.5rem' }}>{money(perdidaMermas)}</h3>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div style={{ display: 'flex', padding: '0 20px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
                <button
                    onClick={() => setActiveTab('ventas')}
                    style={{ flex: 1, padding: '15px', border: 'none', background: 'none', borderBottom: activeTab === 'ventas' ? '3px solid #2e7d32' : '3px solid transparent', color: activeTab === 'ventas' ? '#2e7d32' : '#666', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                    Ventas ({ventas.length})
                </button>
                <button
                    onClick={() => setActiveTab('mermas')}
                    style={{ flex: 1, padding: '15px', border: 'none', background: 'none', borderBottom: activeTab === 'mermas' ? '3px solid #c62828' : '3px solid transparent', color: activeTab === 'mermas' ? '#c62828' : '#666', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
                >
                    Mermas ({mermas.length})
                </button>
            </div>

            {/* LISTA DE REGISTROS */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                {activeTab === 'ventas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {ventas.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No hay ventas registradas en esta fecha.</p>
                        ) : (
                            ventas.map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{v.productName}</h4>
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>{formatHora(v.date)} • {v.quantity} {v.unit} • Módulo: {v.moduleId}</span>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div>
                                            <strong style={{ display: 'block', color: '#2e7d32', fontSize: '1.1rem' }}>{money(v.total)}</strong>
                                            <span style={{ fontSize: '0.8rem', color: '#1565c0' }}>Ganancia: {money(v.profit)}</span>
                                        </div>
                                        <button onClick={() => eliminarRegistro(v.id!, 'venta')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><IconTrash /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'mermas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {mermas.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>No hay mermas registradas en esta fecha.</p>
                        ) : (
                            mermas.map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #c62828' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{m.productName}</h4>
                                        <span style={{ fontSize: '0.85rem', color: '#666' }}>{formatHora(m.date)} • {m.quantity} {m.unit} • Módulo: {m.moduleId}</span>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#666', display: 'block' }}>Costo Perdido</span>
                                            <strong style={{ color: '#c62828', fontSize: '1.1rem' }}>-{money(m.costLost)}</strong>
                                        </div>
                                        <button onClick={() => eliminarRegistro(m.id!, 'merma')} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}><IconTrash /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
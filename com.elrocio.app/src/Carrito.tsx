import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from './db';

// Iconos
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const IconCart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>;
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5v14" /></svg>;
const IconMinus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>;
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;

const money = (value: number) => `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;

export default function Carrito() {
    const navigate = useNavigate();
    const [activeModule, setActiveModule] = useState('carretilla');
    const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para el teclado numérico
    const [pagoCon, setPagoCon] = useState<string>('');

    // Traer productos del módulo seleccionado
    const products = useLiveQuery(
        () => db.products.where({ moduleId: activeModule }).toArray(),
        [activeModule]
    ) || [];

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Lógica del carrito
    const addToCart = (product: Product) => {
        if (product.stock <= 0) return;
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    const clearCart = () => {
        setCart([]);
        setPagoCon('');
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.sale * item.quantity), 0), [cart]);

    // Calcular el vuelto
    const pagoNumerico = parseFloat(pagoCon) || 0;
    const vuelto = pagoNumerico - cartTotal;
    const faltante = cartTotal - pagoNumerico;

    // Manejo del teclado numérico
    const handleKeypadPress = (key: string) => {
        if (key === 'C') {
            setPagoCon('');
            return;
        }
        if (key === 'DEL') {
            setPagoCon(prev => prev.slice(0, -1));
            return;
        }
        if (key === 'EXACTO') {
            setPagoCon(cartTotal.toString());
            return;
        }

        // Validaciones para no romper la entrada
        if (key === '.' && pagoCon.includes('.')) return;
        if (key === '.' && pagoCon === '') {
            setPagoCon('0.');
            return;
        }
        if (pagoCon.includes('.')) {
            const parts = pagoCon.split('.');
            if (parts[1]?.length >= 2) return;
        }
        if (pagoCon === '0' && key !== '.') {
            setPagoCon(key);
            return;
        }
        if (pagoCon === '' && key === '00') return;

        setPagoCon(prev => prev + key);
    };

    // Procesar la venta
    const processSale = async () => {
        if (cart.length === 0) return;
        if (pagoCon !== '' && pagoNumerico < cartTotal) {
            alert('El dinero recibido es menor al total a pagar.');
            return;
        }

        try {
            for (const item of cart) {
                await db.sales.add({
                    productId: item.product.id!,
                    productName: item.product.name,
                    quantity: item.quantity,
                    total: item.product.sale * item.quantity,
                    profit: (item.product.sale - item.product.cost) * item.quantity,
                    date: new Date().toISOString(),
                    moduleId: activeModule,
                    unit: item.product.unit
                });

                await db.products.update(item.product.id!, {
                    stock: item.product.stock - item.quantity
                });
            }

            alert(`¡Venta registrada! ${vuelto > 0 ? `Vuelto: ${money(vuelto)}` : ''}`);
            clearCart();
        } catch (error) {
            console.error("Error al procesar la venta:", error);
            alert('Hubo un error al guardar la venta.');
        }
    };

    return (
        <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f5f5f5' }}>

            {/* HEADER DEL CARRITO */}
            <header className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <IconBack />
                </button>
                <div className="brand-lockup" style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Ventas Rápidas</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '20px' }}>
                    <IconCart />
                    <span style={{ fontWeight: 'bold' }}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
            </header>

            {/* SELECTOR DE MÓDULO */}
            <div style={{ display: 'flex', gap: '10px', padding: '15px', overflowX: 'auto', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
                {['carretilla', 'estante', 'carnicos', 'almacen'].map((mod) => (
                    <button
                        key={mod}
                        onClick={() => { setActiveModule(mod); clearCart(); }}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', border: 'none',
                            backgroundColor: activeModule === mod ? '#2e7d32' : '#e0e0e0',
                            color: activeModule === mod ? 'white' : '#333',
                            fontWeight: 'bold', textTransform: 'capitalize', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                    >
                        {mod}
                    </button>
                ))}
            </div>

            {/* LAYOUT PRINCIPAL */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* COLUMNA IZQUIERDA: PRODUCTOS */}
                <div style={{ flex: 2, padding: '20px', overflowY: 'auto' }}>
                    <input
                        type="text" placeholder="Buscar producto..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '1rem' }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                        {filteredProducts.map(product => (
                            <div
                                key={product.id} onClick={() => addToCart(product)}
                                style={{
                                    backgroundColor: 'white', borderRadius: '12px', padding: '15px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                                    opacity: product.stock > 0 ? 1 : 0.5, border: '1px solid #eee',
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                }}
                            >
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{product.name}</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>Stock: {product.stock} {product.unit}</p>
                                </div>
                                <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#2e7d32' }}>{money(product.sale)}</span>
                                    <div style={{ backgroundColor: '#e8f5e9', padding: '5px', borderRadius: '50%', color: '#2e7d32' }}>
                                        <IconPlus />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUMNA DERECHA: EL CARRITO Y TECLADO */}
                <div style={{ flex: 1, backgroundColor: 'white', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column', minWidth: '360px', maxWidth: '420px' }}>

                    <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Cuenta Actual</h2>
                        <button onClick={clearCart} style={{ background: 'none', border: 'none', color: '#c62828', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}>
                            <IconTrash /> Limpiar
                        </button>
                    </div>

                    {/* LISTA DEL CARRITO */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#aaa', marginTop: '30px' }}>
                                <IconCart />
                                <p>El carrito está vacío</p>
                                <small>Toca un producto de la izquierda</small>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>{item.product.name}</p>
                                        <small style={{ color: '#666' }}>{money(item.product.sale)} x {item.quantity} {item.product.unit}</small>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '8px' }}>
                                        <button onClick={() => removeFromCart(item.product.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><IconMinus /></button>
                                        <span style={{ fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                        <button onClick={() => addToCart(item.product)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><IconPlus /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* PANEL INFERIOR: TOTAL, TECLADO Y VUELTO */}
                    <div style={{ padding: '15px', backgroundColor: '#fafafa', borderTop: '1px solid #ddd' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.2rem' }}>
                            <span style={{ color: '#666' }}>Total a Pagar:</span>
                            <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>{money(cartTotal)}</span>
                        </div>

                        {/* PANTALLA DE EFECTIVO */}
                        <div style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #90caf9', display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.8rem', color: '#1565c0', fontWeight: 'bold', marginBottom: '5px' }}>Efectivo Recibido:</label>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'right', color: '#0d47a1', minHeight: '40px' }}>
                                {pagoCon === '' ? '0.00' : pagoCon}
                            </div>
                        </div>

                        {/* TECLADO NUMÉRICO PROFESIONAL */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '15px' }}>
                            {['1', '2', '3', 'DEL'].map(k => (
                                <button key={k} onClick={() => handleKeypadPress(k)} style={{ padding: '15px 0', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: k === 'DEL' ? '#ffebee' : 'white', color: k === 'DEL' ? '#c62828' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>{k}</button>
                            ))}
                            {['4', '5', '6', 'C'].map(k => (
                                <button key={k} onClick={() => handleKeypadPress(k)} style={{ padding: '15px 0', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: k === 'C' ? '#ffebee' : 'white', color: k === 'C' ? '#c62828' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>{k}</button>
                            ))}
                            {['7', '8', '9', '00'].map(k => (
                                <button key={k} onClick={() => handleKeypadPress(k)} style={{ padding: '15px 0', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>{k}</button>
                            ))}
                            {['0', '.', 'EXACTO'].map(k => (
                                <button key={k} onClick={() => handleKeypadPress(k)} style={{ gridColumn: k === 'EXACTO' ? 'span 2' : 'span 1', padding: '15px 0', fontSize: k === 'EXACTO' ? '1rem' : '1.2rem', fontWeight: 'bold', backgroundColor: k === 'EXACTO' ? '#bbdefb' : 'white', color: k === 'EXACTO' ? '#0d47a1' : '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }}>{k}</button>
                            ))}
                        </div>

                        {/* RESULTADO DEL VUELTO */}
                        {pagoCon !== '' && (
                            <div style={{ textAlign: 'center', marginBottom: '10px', padding: '10px', borderRadius: '8px', backgroundColor: faltante > 0 ? '#ffebee' : '#e8f5e9' }}>
                                {faltante > 0 ? (
                                    <div style={{ color: '#c62828' }}>
                                        <span style={{ fontSize: '0.85rem', display: 'block' }}>Falta:</span>
                                        <strong style={{ fontSize: '1.5rem' }}>{money(faltante)}</strong>
                                    </div>
                                ) : (
                                    <div style={{ color: '#2e7d32' }}>
                                        <span style={{ fontSize: '0.85rem', display: 'block' }}>Vuelto:</span>
                                        <strong style={{ fontSize: '2rem' }}>{money(vuelto)}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BOTÓN DE COBRAR */}
                        <button
                            onClick={processSale}
                            disabled={cart.length === 0 || (pagoCon !== '' && pagoNumerico < cartTotal)}
                            style={{
                                width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
                                backgroundColor: cart.length === 0 || (pagoCon !== '' && pagoNumerico < cartTotal) ? '#ccc' : '#2e7d32',
                                color: 'white', fontSize: '1.2rem', fontWeight: 'bold',
                                cursor: cart.length === 0 || (pagoCon !== '' && pagoNumerico < cartTotal) ? 'not-allowed' : 'pointer',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
                            }}
                        >
                            COBRAR
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
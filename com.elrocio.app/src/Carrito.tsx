import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Sale } from './db';

// Iconos simples (puedes usar los mismos de App.tsx si quieres)
const IconBack = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const IconClose = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>;
const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>;

type CartItem = Product & { cartQty: number };

export default function Carrito() {
    const navigate = useNavigate();
    const [activeModuleFilter, setActiveModuleFilter] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCobrando, setIsCobrando] = useState(false);
    const [ventaExitosa, setVentaExitosa] = useState(false);

    // Traemos TODOS los productos de los módulos de venta (no el almacén)
    const allProducts = useLiveQuery(() => db.products.where('moduleId').notEqual('almacen').toArray(), []) || [];

    const filteredProducts = useMemo(() => {
        let filtered = allProducts;
        if (activeModuleFilter !== 'todos') {
            filtered = filtered.filter(p => p.moduleId === activeModuleFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return filtered;
    }, [allProducts, activeModuleFilter, searchTerm]);

    const totalCarrito = cart.reduce((sum, item) => sum + (item.sale * item.cartQty), 0);

    // Agregar producto al carrito
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                if (existing.cartQty >= product.stock) return prev; // No vender más del stock
                return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
            }
            return [...prev, { ...product, cartQty: 1 }];
        });
    };

    // Quitar producto del carrito
    const removeFromCart = (productId: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === productId);
            if (existing && existing.cartQty > 1) {
                return prev.map(item => item.id === productId ? { ...item, cartQty: item.cartQty - 1 } : item);
            }
            return prev.filter(item => item.id !== productId);
        });
    };

    // Eliminar toda la línea del carrito
    const deleteFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    // Cobrar
    const handleCobrar = async () => {
        if (cart.length === 0) return;
        setIsCobrando(true);

        try {
            // 1. Guardar cada venta en la base de datos y actualizar stock
            for (const item of cart) {
                await db.sales.add({
                    productId: item.id!,
                    productName: item.name,
                    quantity: item.cartQty,
                    total: item.sale * item.cartQty,
                    profit: (item.sale - item.cost) * item.cartQty,
                    date: new Date().toISOString(),
                    moduleId: item.moduleId,
                    unit: item.unit
                });
                await db.products.update(item.id!, { stock: item.stock - item.cartQty });
            }

            setVentaExitosa(true);
            setTimeout(() => {
                setCart([]);
                setVentaExitosa(false);
                setIsCobrando(false);
            }, 2000);

        } catch (error) {
            console.error(error);
            alert("Error al cobrar. Intenta de nuevo.");
            setIsCobrando(false);
        }
    };

    const modulesFilter = [
        { id: 'todos', label: 'Todos' },
        { id: 'carretilla', label: 'Carretilla' },
        { id: 'estante', label: 'Estante' },
        { id: 'carnicos', label: 'Cárnicos' }
    ];

    return (
        <div className="pos-layout">
            {/* LADO IZQUIERDO: CATÁLOGO */}
            <div className="pos-catalog">
                <header className="pos-header">
                    <button className="pos-back-btn" onClick={() => navigate('/')}>
                        <IconBack /> Volver
                    </button>
                    <h2>Ventas Rápidas</h2>
                </header>

                <div className="pos-search">
                    <IconSearch />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="pos-filters">
                    {modulesFilter.map(mod => (
                        <button
                            key={mod.id}
                            className={`pos-filter-btn ${activeModuleFilter === mod.id ? 'active' : ''}`}
                            onClick={() => setActiveModuleFilter(mod.id)}
                        >
                            {mod.label}
                        </button>
                    ))}
                </div>

                <div className="pos-product-grid">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className={`pos-product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                            onClick={() => product.stock > 0 && addToCart(product)}
                        >
                            <div className="pos-product-name">{product.name}</div>
                            <div className="pos-product-price">${product.sale.toFixed(2)}</div>
                            <div className="pos-product-stock">Stock: {product.stock} {product.unit}</div>
                            {product.stock <= 0 && <div className="pos-out-of-stock-label">AGOTADO</div>}
                        </div>
                    ))}
                    {filteredProducts.length === 0 && <p className="pos-empty">No hay productos disponibles.</p>}
                </div>
            </div>

            {/* LADO DERECHO: TICKET / COBRO */}
            <div className="pos-ticket">
                <header className="pos-ticket-header">
                    <h3>Ticket de Venta</h3>
                    <span>{cart.length} productos</span>
                </header>

                <div className="pos-ticket-list">
                    {cart.length === 0 ? (
                        <div className="pos-ticket-empty">
                            <p>Toca un producto para agregarlo</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="pos-ticket-item">
                                <div className="pos-ticket-info">
                                    <strong>{item.name}</strong>
                                    <span>${item.sale.toFixed(2)} x {item.cartQty} {item.unit}</span>
                                </div>
                                <div className="pos-ticket-actions">
                                    <div className="pos-qty-controls">
                                        <button onClick={() => removeFromCart(item.id!)}>-</button>
                                        <span>{item.cartQty}</span>
                                        <button onClick={() => addToCart(item)}>+</button>
                                    </div>
                                    <button className="pos-delete-btn" onClick={() => deleteFromCart(item.id!)}><IconClose /></button>
                                </div>
                                <div className="pos-ticket-subtotal">
                                    ${(item.sale * item.cartQty).toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="pos-ticket-footer">
                    <div className="pos-total">
                        <span>TOTAL A COBRAR:</span>
                        <strong>${totalCarrito.toFixed(2)}</strong>
                    </div>
                    <button
                        className={`pos-cobrar-btn ${cart.length === 0 || isCobrando ? 'disabled' : ''}`}
                        onClick={handleCobrar}
                        disabled={cart.length === 0 || isCobrando}
                    >
                        {isCobrando ? 'Procesando...' : ventaExitosa ? <><IconCheck /> ¡Cobrado!</> : 'COBRAR'}
                    </button>
                </div>
            </div>
        </div>
    );
}
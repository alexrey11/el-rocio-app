import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product } from './db';
import type { JSX, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type PaymentMethod = 'efectivo' | 'transferencia' | 'mixto';
type IconKey =
    | 'back' | 'cart' | 'plus' | 'minus' | 'trash' | 'search' | 'close'
    | 'check' | 'money' | 'cash' | 'card' | 'split' | 'scale'
    | 'package' | 'chevron-up' | 'x';

interface CartItem { product: Product; quantity: number; }
interface Toast { msg: string; type: 'success' | 'error' | 'info'; }

const TABS = ['carretilla', 'estante', 'carnicos'] as const;
const TAB_LABELS: Record<string, string> = {
    carretilla: 'Carretilla',
    estante: 'Estante',
    carnicos: 'Cárnicos',
};

const UNIDADES_FRACCION = ['libras', 'kilogramos', 'gramos', 'litros', 'mililitros'];
const isWeight = (unit: string) => UNIDADES_FRACCION.includes(unit);
const money = (v: number) => `$${v.toFixed(v % 1 === 0 ? 0 : 2)}`;

// ═══════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════
const useIsMobile = (bp = 900): boolean => {
    const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < bp : false);
    useEffect(() => {
        const check = () => setM(window.innerWidth < bp);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [bp]);
    return m;
};

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════
const Icon = ({ name, size = 20 }: { name: IconKey; size?: number }) => {
    const p: Record<IconKey, JSX.Element> = {
        back: <path d="m15 18-6-6 6-6" />,
        cart: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>,
        plus: <><path d="M12 5v14M5 12h14" /></>,
        minus: <path d="M5 12h14" />,
        trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></>,
        search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
        close: <><path d="m6 6 12 12M18 6 6 18" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        money: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-.6-1.3-.9-2.4-.9-1.4 0-2.3.7-2.3 1.7 0 2.7 5 1.2 5 4 0 1-.9 1.7-2.4 1.7-1.1 0-2-.3-2.6-1M12 6.8v10.4" /></>,
        cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
        card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
        split: <><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /></>,
        scale: <><path d="M12 3v18M3 7l9-4 9 4M5 21h14" /></>,
        package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21" /></>,
        'chevron-up': <path d="m18 15-6-6-6 6" />,
        'x': <><path d="m6 6 12 12M18 6 6 18" /></>,
    };
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {p[name]}
        </svg>
    );
};

// ═══════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════
const GlobalStyles = () => (
    <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes pop { 0% { transform: scale(.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    .pos-anim { animation: fadeUp .3s ease both; }
    .pos-sheet { animation: slideUp .32s cubic-bezier(.22,1,.36,1) both; }
    .pos-pop { animation: pop .2s ease both; }
    .pos-card { transition: transform .15s ease, box-shadow .2s ease; }
    .pos-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -8px rgba(15,23,42,.15); }
    .pos-card:active { transform: scale(.98); }
    .pos-btn { transition: all .15s ease; }
    .pos-btn:active { transform: scale(.96); }
    .pos-input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px rgba(5,150,105,.15) !important; }
    .pos-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .pos-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    .pos-scroll::-webkit-scrollbar-track { background: transparent; }
    .pos-tab { transition: all .18s ease; }
    .pos-tab:active { transform: scale(.97); }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type="number"] { -moz-appearance: textfield; }
  `}</style>
);

const inputReset = {
    border: 'none', outline: 'none', fontFamily: 'inherit',
    backgroundColor: 'transparent', cursor: 'pointer',
} as const;

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
const Toast = ({ toast }: { toast: Toast }) => {
    const colors = {
        success: { bg: '#065f46', icon: 'check' as IconKey },
        error: { bg: '#991b1b', icon: 'x' as IconKey },
        info: { bg: '#1e40af', icon: 'money' as IconKey },
    };
    const c = colors[toast.type];
    return (
        <div className="pos-pop" style={{
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: c.bg, color: 'white',
            padding: '14px 20px', borderRadius: '14px',
            boxShadow: '0 10px 40px -8px rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
            fontSize: '0.9rem', fontWeight: 700, zIndex: 9999,
            maxWidth: 'calc(100vw - 32px)',
        }}>
            <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon name={c.icon} size={14} />
            </div>
            <span>{toast.msg}</span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════

// ── Product card ──────────────────────────────────────────
const ProductCard = ({ product, onClick }: { product: Product; onClick: () => void }) => {
    const weight = isWeight(product.unit);
    const disabled = product.stock <= 0;
    return (
        <div
            className="pos-card"
            onClick={disabled ? undefined : onClick}
            style={{
                backgroundColor: 'white', borderRadius: '14px', padding: '14px',
                border: weight ? '2px solid #bfdbfe' : '1px solid rgba(15,23,42,.06)',
                boxShadow: '0 1px 2px rgba(15,23,42,.04)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                gap: '10px', minHeight: '130px',
                userSelect: 'none',
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div style={{
                    fontWeight: 700, fontSize: '0.9rem', color: '#0f172a',
                    lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                    {product.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                    Stock: {product.stock.toFixed(weight ? 2 : 0)} {product.unit}
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                    fontWeight: 800, fontSize: '1.05rem', color: '#059669',
                    fontVariantNumeric: 'tabular-nums',
                }}>{money(product.sale)}</span>
                <div style={{
                    width: '30px', height: '30px', borderRadius: '10px',
                    backgroundColor: weight ? '#dbeafe' : '#ecfdf5',
                    color: weight ? '#2563eb' : '#059669',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name={weight ? 'scale' : 'plus'} size={15} />
                </div>
            </div>
        </div>
    );
};

// ── Cart row ──────────────────────────────────────────────
const CartRow = ({
    item, onInc, onDec, compact,
}: { item: CartItem; onInc: () => void; onDec: () => void; compact?: boolean }) => {
    const weight = isWeight(item.product.unit);
    const subtotal = item.product.sale * item.quantity;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: compact ? '10px 12px' : '12px 0',
            borderBottom: '1px solid #f1f5f9',
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 700, fontSize: '0.88rem', color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{item.product.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {money(item.product.sale)} × {item.quantity.toFixed(weight ? 2 : 0)} {item.product.unit}
                </div>
                <div style={{
                    fontSize: '0.78rem', color: '#059669', fontWeight: 800,
                    marginTop: '2px', fontVariantNumeric: 'tabular-nums',
                }}>
                    = {money(subtotal)}
                </div>
            </div>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '2px',
                backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '3px',
                flexShrink: 0,
            }}>
                <button onClick={onDec} className="pos-btn" style={{
                    width: '28px', height: '28px', borderRadius: '7px', border: 'none',
                    backgroundColor: 'white', color: '#dc2626', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name="minus" size={14} />
                </button>
                <span style={{
                    minWidth: weight ? '42px' : '28px', textAlign: 'center',
                    fontWeight: 800, fontSize: '0.8rem', color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {item.quantity.toFixed(weight ? 2 : 0)}
                </span>
                <button onClick={onInc} className="pos-btn" style={{
                    width: '28px', height: '28px', borderRadius: '7px', border: 'none',
                    backgroundColor: 'white', color: '#059669', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name="plus" size={14} />
                </button>
            </div>
        </div>
    );
};

// ── Empty cart ────────────────────────────────────────────
const EmptyCart = () => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '10px', padding: '50px 20px',
        color: '#94a3b8', textAlign: 'center',
    }}>
        <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            backgroundColor: '#f1f5f9', color: '#cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Icon name="cart" size={26} />
        </div>
        <div>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>Carrito vacío</div>
            <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>Toca un producto para agregarlo</div>
        </div>
    </div>
);

// ── Numeric keypad ────────────────────────────────────────
const Keypad = ({ onKey }: { onKey: (k: string) => void }) => {
    const keys = [
        ['1', '2', '3', 'DEL'],
        ['4', '5', '6', 'C'],
        ['7', '8', '9', '00'],
        ['0', '.', 'EXACTO'],
    ];
    const cell = (k: string, extra?: React.CSSProperties) => {
        const isAction = k === 'DEL' || k === 'C' || k === 'EXACTO';
        const isExacto = k === 'EXACTO';
        return (
            <button key={k} onClick={() => onKey(k)} className="pos-btn" style={{
                padding: '14px 0',
                fontSize: isExacto ? '0.8rem' : '1.05rem',
                fontWeight: 800,
                backgroundColor: isExacto ? '#dbeafe' : k === 'DEL' || k === 'C' ? '#fef2f2' : 'white',
                color: isExacto ? '#1d4ed8' : k === 'DEL' || k === 'C' ? '#dc2626' : '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                ...extra,
            }}>{k === 'DEL' ? '⌫' : k === 'C' ? 'C' : k}</button>
        );
    };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {keys.map((row, i) => row.map(k => {
                if (k === 'EXACTO') {
                    return <div key={`exacto-wrap`} style={{ gridColumn: 'span 2' }}>{cell(k)}</div>;
                }
                return cell(k);
            }))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function Carrito() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [activeModule, setActiveModule] = useState<string>('carretilla');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagoCon, setPagoCon] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
    const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
    const [qtyModalValue, setQtyModalValue] = useState('');
    const [cartSheetOpen, setCartSheetOpen] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const products = useLiveQuery(
        () => db.products.where({ moduleId: activeModule }).toArray(),
        [activeModule]
    ) ?? [];

    const filteredProducts = useMemo(
        () => products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [products, searchTerm]
    );

    const productosPorPeso = useMemo(
        () => filteredProducts.filter((p) => isWeight(p.unit)),
        [filteredProducts]
    );
    const productosPorUnidad = useMemo(
        () => filteredProducts.filter((p) => !isWeight(p.unit)),
        [filteredProducts]
    );

    const cartTotal = useMemo(
        () => cart.reduce((sum, item) => sum + item.product.sale * item.quantity, 0),
        [cart]
    );
    const cartCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    const pagoNumerico = parseFloat(pagoCon) || 0;
    const vuelto = pagoNumerico - cartTotal;
    const faltante = cartTotal - pagoNumerico;

    // ── Cart actions ────────────────────────────────────────
    const handleProductClick = (product: Product) => {
        if (product.stock <= 0) return;
        if (isWeight(product.unit)) {
            setQtyModalProduct(product);
            setQtyModalValue('');
        } else {
            addToCart(product, 1);
        }
    };

    const addToCart = (product: Product, qty: number = 1) => {
        if (product.stock <= 0) return;
        setCart((prev) => {
            const existing = prev.find((i) => i.product.id === product.id);
            if (existing) {
                const newQty = existing.quantity + qty;
                if (newQty > product.stock) return prev;
                return prev.map((i) => i.product.id === product.id ? { ...i, quantity: newQty } : i);
            }
            if (qty > product.stock) return prev;
            return [...prev, { product, quantity: qty }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.product.id === productId);
            if (!existing) return prev;
            const step = isWeight(existing.product.unit) ? 0.25 : 1;
            const newQty = existing.quantity - step;
            if (newQty <= 0) return prev.filter((i) => i.product.id !== productId);
            return prev.map((i) => i.product.id === productId ? { ...i, quantity: newQty } : i);
        });
    };

    const clearCart = () => { setCart([]); setPagoCon(''); };

    const confirmQtyModal = () => {
        if (!qtyModalProduct) return;
        const qty = parseFloat(qtyModalValue);
        if (isNaN(qty) || qty <= 0) {
            setToast({ msg: 'Ingresa una cantidad válida', type: 'error' });
            return;
        }
        if (qty > qtyModalProduct.stock) {
            setToast({ msg: `Solo hay ${qtyModalProduct.stock} ${qtyModalProduct.unit} disponibles`, type: 'error' });
            return;
        }
        addToCart(qtyModalProduct, qty);
        setQtyModalProduct(null);
        setQtyModalValue('');
    };

    // ── Keypad ─────────────────────────────────────────────
    const handleKeypadPress = (key: string) => {
        if (key === 'C') { setPagoCon(''); return; }
        if (key === 'DEL') { setPagoCon((p) => p.slice(0, -1)); return; }
        if (key === 'EXACTO') { setPagoCon(cartTotal.toString()); return; }
        if (key === '.' && pagoCon.includes('.')) return;
        if (key === '.' && pagoCon === '') { setPagoCon('0.'); return; }
        if (pagoCon.includes('.')) {
            const [, dec] = pagoCon.split('.');
            if (dec.length >= 2) return;
        }
        if (pagoCon === '0' && key !== '.') { setPagoCon(key); return; }
        if (pagoCon === '' && key === '00') return;
        setPagoCon((p) => p + key);
    };

    // ── Process sale ────────────────────────────────────────
    const processSale = async () => {
        if (cart.length === 0) return;
        if (paymentMethod === 'efectivo' && pagoCon !== '' && pagoNumerico < cartTotal) {
            setToast({ msg: 'El dinero recibido es menor al total', type: 'error' });
            return;
        }
        if (paymentMethod === 'transferencia' && pagoCon !== '' && pagoNumerico !== cartTotal) {
            setToast({ msg: 'La transferencia debe ser exacta al total', type: 'error' });
            return;
        }

        let cashAmount = 0;
        let transferAmount = 0;

        if (paymentMethod === 'efectivo') {
            cashAmount = cartTotal;
        } else if (paymentMethod === 'transferencia') {
            transferAmount = cartTotal;
        } else {
            cashAmount = parseFloat(pagoCon) || 0;
            transferAmount = cartTotal - cashAmount;
            if (cashAmount < 0 || transferAmount < 0) {
                setToast({ msg: 'Montos del pago mixto inválidos', type: 'error' });
                return;
            }
        }

        try {
            for (const item of cart) {
                const itemTotal = item.product.sale * item.quantity;
                const ratio = cartTotal > 0 ? itemTotal / cartTotal : 0;

                await db.sales.add({
                    productId: item.product.id!,
                    productName: item.product.name,
                    quantity: item.quantity,
                    total: itemTotal,
                    profit: (item.product.sale - item.product.cost) * item.quantity,
                    date: new Date().toISOString(),
                    moduleId: item.product.moduleId,
                    unit: item.product.unit,
                    paymentMethod,
                    cashAmount: cashAmount * ratio,
                    transferAmount: transferAmount * ratio,
                });

                await db.products.update(item.product.id!, {
                    stock: item.product.stock - item.quantity,
                });
            }

            const vueltoMsg = vuelto > 0 && paymentMethod === 'efectivo' ? ` · Vuelto: ${money(vuelto)}` : '';
            setToast({ msg: `¡Venta registrada!${vueltoMsg}`, type: 'success' });

            clearCart();
            setShowPaymentModal(false);
            setCartSheetOpen(false);
            setPaymentMethod('efectivo');
        } catch (error) {
            console.error('[Carrito] Error al procesar venta:', error);
            setToast({ msg: 'Error al guardar la venta', type: 'error' });
        }
    };

    // ══════════ CART CONTENT (compartido entre desktop panel y mobile sheet)
    const cartContent = (
        <>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#fafbfc',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '9px',
                        backgroundColor: '#ecfdf5', color: '#059669',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon name="cart" size={16} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                            Cuenta actual
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                            {cart.length} producto{cart.length !== 1 ? 's' : ''} · {cartCount.toFixed(2)} unid.
                        </div>
                    </div>
                </div>
                {cart.length > 0 && (
                    <button onClick={clearCart} className="pos-btn" style={{
                        ...inputReset, padding: '6px 10px', borderRadius: '8px',
                        color: '#dc2626', fontWeight: 700, fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <Icon name="trash" size={14} /> Limpiar
                    </button>
                )}
            </div>

            <div className="pos-scroll" style={{
                flex: 1, overflowY: 'auto',
                padding: '12px 16px',
                minHeight: 0,
            }}>
                {cart.length === 0 ? <EmptyCart /> : cart.map((item) => (
                    <CartRow
                        key={item.product.id}
                        item={item}
                        onInc={() => handleProductClick(item.product)}
                        onDec={() => removeFromCart(item.product.id!)}
                        compact={isMobile}
                    />
                ))}
            </div>

            <div style={{
                padding: '14px 16px 16px',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#fafbfc',
                flexShrink: 0,
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    marginBottom: '12px',
                }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Total</span>
                    <span style={{
                        fontSize: '1.6rem', fontWeight: 900, color: '#059669',
                        letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                    }}>{money(cartTotal)}</span>
                </div>
                <button
                    onClick={() => { if (cart.length > 0) setShowPaymentModal(true); }}
                    disabled={cart.length === 0}
                    className="pos-btn"
                    style={{
                        width: '100%', padding: '16px', borderRadius: '14px',
                        border: 'none',
                        background: cart.length === 0
                            ? '#cbd5e1'
                            : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                        color: 'white', fontSize: '1rem', fontWeight: 900,
                        letterSpacing: '0.04em',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: cart.length === 0
                            ? 'none'
                            : '0 8px 20px -6px rgba(5,150,105,.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                >
                    <Icon name="money" size={18} /> COBRAR
                </button>
            </div>
        </>
    );

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '100vh', backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}>
            <GlobalStyles />

            {/* HEADER */}
            <header style={{
                background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10b981 100%)',
                padding: '14px 16px',
                boxShadow: '0 4px 24px -6px rgba(5, 150, 105, 0.4)',
                display: 'flex', alignItems: 'center', gap: '12px',
                flexShrink: 0, zIndex: 20,
            }}>
                <button onClick={() => navigate('/')} className="pos-btn" style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(6px)',
                }}>
                    <Icon name="back" size={20} />
                </button>
                <div style={{ flex: 1, color: 'white', minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                        Ventas Rápidas
                    </div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
                        Punto de venta
                    </div>
                </div>
                {!isMobile && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 14px', backgroundColor: 'rgba(255,255,255,.18)',
                        borderRadius: '12px', color: 'white', fontWeight: 800, fontSize: '0.9rem',
                        backdropFilter: 'blur(6px)',
                    }}>
                        <Icon name="cart" size={18} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{cartCount.toFixed(2)}</span>
                    </div>
                )}
            </header>

            {/* MODULE TABS */}
            <div style={{
                display: 'flex', gap: '6px',
                padding: '12px 16px', backgroundColor: 'white',
                borderBottom: '1px solid #f1f5f9',
                overflowX: 'auto', flexShrink: 0,
            }}>
                {TABS.map((mod) => {
                    const active = activeModule === mod;
                    return (
                        <button key={mod} onClick={() => setActiveModule(mod)} className="pos-tab" style={{
                            ...inputReset,
                            padding: '8px 16px', borderRadius: '10px',
                            backgroundColor: active ? '#ecfdf5' : '#f1f5f9',
                            color: active ? '#047857' : '#64748b',
                            fontWeight: 800, fontSize: '0.82rem',
                            border: active ? '1px solid #a7f3d0' : '1px solid transparent',
                            whiteSpace: 'nowrap',
                        }}>
                            {TAB_LABELS[mod]}
                        </button>
                    );
                })}
            </div>

            {/* BODY */}
            <div style={{
                flex: 1, display: 'flex', overflow: 'hidden',
                paddingBottom: isMobile && cart.length > 0 ? '80px' : 0,
            }}>
                {/* PRODUCTS */}
                <div className="pos-scroll" style={{
                    flex: isMobile ? 1 : 2,
                    padding: '14px 16px',
                    overflowY: 'auto',
                    minWidth: 0,
                }}>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <div style={{
                            position: 'absolute', left: '14px', top: '50%',
                            transform: 'translateY(-50%)', color: '#94a3b8',
                            pointerEvents: 'none',
                        }}>
                            <Icon name="search" size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pos-input"
                            style={{
                                width: '100%', padding: '12px 14px 12px 42px',
                                borderRadius: '12px', border: '1.5px solid #e2e8f0',
                                fontSize: '0.92rem', outline: 'none',
                                backgroundColor: 'white',
                                transition: 'border-color .15s, box-shadow .15s',
                            }}
                        />
                    </div>

                    {productosPorPeso.length > 0 && (
                        <section style={{ marginBottom: '22px' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginBottom: '10px', color: '#1d4ed8',
                            }}>
                                <Icon name="scale" size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    Por peso / volumen
                                </span>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '10px',
                            }}>
                                {productosPorPeso.map((product) => (
                                    <ProductCard key={product.id} product={product}
                                        onClick={() => handleProductClick(product)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {productosPorUnidad.length > 0 && (
                        <section>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                marginBottom: '10px', color: '#ea580c',
                            }}>
                                <Icon name="package" size={16} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    Por unidad
                                </span>
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '10px',
                            }}>
                                {productosPorUnidad.map((product) => (
                                    <ProductCard key={product.id} product={product}
                                        onClick={() => handleProductClick(product)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {filteredProducts.length === 0 && (
                        <div style={{
                            textAlign: 'center', color: '#94a3b8', marginTop: '60px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '14px',
                                backgroundColor: '#f1f5f9', color: '#cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Icon name="search" size={22} />
                            </div>
                            <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>
                                Sin productos en este módulo
                            </div>
                        </div>
                    )}
                </div>

                {/* DESKTOP CART */}
                {!isMobile && (
                    <div style={{
                        width: '380px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        backgroundColor: 'white',
                        borderLeft: '1px solid #e2e8f0',
                    }}>
                        {cartContent}
                    </div>
                )}
            </div>

            {/* MOBILE FLOATING CART BAR */}
            {isMobile && cart.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    padding: '12px 14px',
                    backgroundColor: 'white',
                    borderTop: '1px solid #e2e8f0',
                    boxShadow: '0 -8px 24px -8px rgba(15,23,42,.12)',
                    zIndex: 30,
                    display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                    <button onClick={() => setCartSheetOpen(true)} className="pos-btn" style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 14px', borderRadius: '12px',
                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                        cursor: 'pointer', textAlign: 'left',
                    }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '11px',
                            backgroundColor: '#ecfdf5', color: '#059669',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', flexShrink: 0,
                        }}>
                            <Icon name="cart" size={18} />
                            <div style={{
                                position: 'absolute', top: -4, right: -4,
                                minWidth: '18px', height: '18px',
                                padding: '0 5px', borderRadius: '9px',
                                backgroundColor: '#059669', color: 'white',
                                fontSize: '0.65rem', fontWeight: 900,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid white',
                            }}>{cart.length}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Ver cuenta
                            </div>
                            <div style={{
                                fontSize: '1.1rem', fontWeight: 900, color: '#059669',
                                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                            }}>{money(cartTotal)}</div>
                        </div>
                    </button>
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="pos-btn"
                        style={{
                            padding: '14px 20px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                            color: 'white', fontWeight: 900, fontSize: '0.9rem',
                            letterSpacing: '0.03em', cursor: 'pointer',
                            boxShadow: '0 6px 16px -4px rgba(5,150,105,.5)',
                            flexShrink: 0,
                        }}
                    >
                        COBRAR
                    </button>
                </div>
            )}

            {/* MOBILE CART SHEET */}
            {isMobile && cartSheetOpen && (
                <div
                    onClick={() => setCartSheetOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(15,23,42,.5)',
                        display: 'flex', alignItems: 'flex-end',
                        zIndex: 100,
                    }}>
                    <div onClick={(e) => e.stopPropagation()} className="pos-sheet" style={{
                        width: '100%', maxHeight: '85vh',
                        backgroundColor: 'white',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: '40px', height: '4px', borderRadius: '2px',
                            backgroundColor: '#cbd5e1', margin: '10px auto 4px',
                            flexShrink: 0,
                        }} />
                        {cartContent}
                    </div>
                </div>
            )}

            {/* QTY MODAL */}
            {qtyModalProduct && (
                <div
                    onClick={() => { setQtyModalProduct(null); setQtyModalValue(''); }}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(15,23,42,.5)',
                        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
                        justifyContent: 'center', zIndex: 200,
                        padding: isMobile ? 0 : '20px',
                    }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={isMobile ? 'pos-sheet' : 'pos-pop'}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                            padding: '24px',
                            maxWidth: isMobile ? '100%' : '420px',
                            width: '100%',
                            maxHeight: isMobile ? '90vh' : 'auto',
                            overflowY: 'auto',
                        }}>
                        {isMobile && (
                            <div style={{
                                width: '40px', height: '4px', borderRadius: '2px',
                                backgroundColor: '#cbd5e1', margin: '0 auto 14px',
                            }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                backgroundColor: '#dbeafe', color: '#2563eb',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Icon name="scale" size={20} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>
                                    {qtyModalProduct.name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                                    {money(qtyModalProduct.sale)} / {qtyModalProduct.unit} · Stock: {qtyModalProduct.stock.toFixed(2)}
                                </div>
                            </div>
                            <button onClick={() => { setQtyModalProduct(null); setQtyModalValue(''); }} className="pos-btn" style={{
                                width: '32px', height: '32px', borderRadius: '9px',
                                border: 'none', backgroundColor: '#f1f5f9', color: '#64748b',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        <label style={{
                            display: 'block', fontSize: '0.78rem', fontWeight: 700,
                            color: '#475569', marginBottom: '8px',
                            letterSpacing: '0.03em', textTransform: 'uppercase',
                        }}>
                            Cantidad ({qtyModalProduct.unit})
                        </label>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            autoFocus
                            value={qtyModalValue}
                            onChange={(e) => setQtyModalValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmQtyModal(); }}
                            placeholder="0.00"
                            className="pos-input"
                            style={{
                                width: '100%', padding: '16px',
                                fontSize: '2rem', textAlign: 'center',
                                borderRadius: '12px', border: '2px solid #bfdbfe',
                                fontWeight: 900, color: '#1e3a8a',
                                fontVariantNumeric: 'tabular-nums',
                                outline: 'none', marginBottom: '14px',
                                transition: 'border-color .15s, box-shadow .15s',
                            }}
                        />

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px', marginBottom: '14px',
                        }}>
                            {['0.25', '0.5', '1', '2', '3', '5', '10', '15'].map((v) => (
                                <button key={v} onClick={() => setQtyModalValue(v)} className="pos-btn" style={{
                                    padding: '11px', borderRadius: '9px',
                                    border: '1px solid #bfdbfe', backgroundColor: '#eff6ff',
                                    color: '#1d4ed8', fontWeight: 800, cursor: 'pointer',
                                    fontSize: '0.92rem',
                                }}>{v}</button>
                            ))}
                        </div>

                        {qtyModalValue && !isNaN(parseFloat(qtyModalValue)) && (
                            <div style={{
                                padding: '14px', backgroundColor: '#ecfdf5',
                                borderRadius: '12px', textAlign: 'center', marginBottom: '14px',
                                border: '1px solid #a7f3d0',
                            }}>
                                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Subtotal
                                </div>
                                <div style={{
                                    fontSize: '1.7rem', fontWeight: 900, color: '#059669',
                                    marginTop: '4px', letterSpacing: '-0.02em',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {money(parseFloat(qtyModalValue) * qtyModalProduct.sale)}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => { setQtyModalProduct(null); setQtyModalValue(''); }}
                                className="pos-btn"
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', backgroundColor: 'white',
                                    color: '#64748b', fontWeight: 800, fontSize: '0.9rem',
                                    cursor: 'pointer',
                                }}>
                                Cancelar
                            </button>
                            <button
                                onClick={confirmQtyModal}
                                className="pos-btn"
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                                    color: 'white', fontWeight: 900, fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 16px -4px rgba(5,150,105,.5)',
                                }}>
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {showPaymentModal && (
                <div
                    onClick={() => { setShowPaymentModal(false); setPaymentMethod('efectivo'); setPagoCon(''); }}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(15,23,42,.5)',
                        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
                        justifyContent: 'center', zIndex: 200,
                        padding: isMobile ? 0 : '20px',
                    }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={isMobile ? 'pos-sheet' : 'pos-pop'}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: isMobile ? '24px 24px 0 0' : '20px',
                            padding: '24px',
                            maxWidth: isMobile ? '100%' : '440px',
                            width: '100%',
                            maxHeight: isMobile ? '92vh' : 'auto',
                            overflowY: 'auto',
                        }}>
                        {isMobile && (
                            <div style={{
                                width: '40px', height: '4px', borderRadius: '2px',
                                backgroundColor: '#cbd5e1', margin: '0 auto 14px',
                            }} />
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Cobrar</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                    Total a pagar:
                                    <span style={{ fontWeight: 900, color: '#059669', marginLeft: '6px', fontSize: '1rem' }}>
                                        {money(cartTotal)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowPaymentModal(false); setPaymentMethod('efectivo'); setPagoCon(''); }}
                                className="pos-btn"
                                style={{
                                    width: '32px', height: '32px', borderRadius: '9px',
                                    border: 'none', backgroundColor: '#f1f5f9', color: '#64748b',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                <Icon name="close" size={16} />
                            </button>
                        </div>

                        {/* Payment method tabs */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px', marginBottom: '18px',
                            padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '12px',
                        }}>
                            {([
                                { id: 'efectivo' as PaymentMethod, label: 'Efectivo', icon: 'cash' as IconKey },
                                { id: 'transferencia' as PaymentMethod, label: 'Transfer.', icon: 'card' as IconKey },
                                { id: 'mixto' as PaymentMethod, label: 'Mixto', icon: 'split' as IconKey },
                            ]).map((m) => {
                                const active = paymentMethod === m.id;
                                return (
                                    <button key={m.id} onClick={() => { setPaymentMethod(m.id); setPagoCon(''); }} className="pos-tab" style={{
                                        ...inputReset, padding: '10px 6px', borderRadius: '9px',
                                        backgroundColor: active ? 'white' : 'transparent',
                                        color: active ? '#059669' : '#64748b',
                                        fontWeight: 800, fontSize: '0.78rem',
                                        boxShadow: active ? '0 2px 8px rgba(15,23,42,.08)' : 'none',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                    }}>
                                        <Icon name={m.icon} size={16} />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* EFECTIVO */}
                        {paymentMethod === 'efectivo' && (
                            <>
                                <div style={{
                                    backgroundColor: '#eff6ff', padding: '12px 14px',
                                    borderRadius: '12px', marginBottom: '12px',
                                    border: '1px solid #bfdbfe',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Paga con
                                    </span>
                                    <span style={{
                                        fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a',
                                        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                                    }}>
                                        {pagoCon === '' ? '0.00' : pagoCon}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                    <Keypad onKey={handleKeypadPress} />
                                </div>

                                {pagoCon !== '' && (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: '12px',
                                        backgroundColor: faltante > 0 ? '#fef2f2' : '#ecfdf5',
                                        border: `1px solid ${faltante > 0 ? '#fecaca' : '#a7f3d0'}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginBottom: '14px',
                                    }}>
                                        <span style={{
                                            fontSize: '0.82rem', fontWeight: 700,
                                            color: faltante > 0 ? '#991b1b' : '#047857',
                                        }}>
                                            {faltante > 0 ? 'Falta' : 'Vuelto'}
                                        </span>
                                        <span style={{
                                            fontSize: '1.4rem', fontWeight: 900,
                                            color: faltante > 0 ? '#dc2626' : '#059669',
                                            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                                        }}>
                                            {money(faltante > 0 ? faltante : vuelto)}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* TRANSFERENCIA */}
                        {paymentMethod === 'transferencia' && (
                            <div style={{
                                padding: '20px 16px', backgroundColor: '#eff6ff',
                                borderRadius: '14px', textAlign: 'center', marginBottom: '14px',
                                border: '1px solid #bfdbfe',
                            }}>
                                <div style={{
                                    display: 'inline-flex', width: '42px', height: '42px',
                                    borderRadius: '12px', backgroundColor: '#dbeafe', color: '#1d4ed8',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
                                }}>
                                    <Icon name="card" size={20} />
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Monto a transferir
                                </div>
                                <div style={{
                                    fontSize: '2rem', fontWeight: 900, color: '#1e3a8a',
                                    marginTop: '4px', letterSpacing: '-0.03em',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {money(cartTotal)}
                                </div>
                            </div>
                        )}

                        {/* MIXTO */}
                        {paymentMethod === 'mixto' && (
                            <div style={{
                                padding: '16px', backgroundColor: '#fff7ed',
                                borderRadius: '14px', marginBottom: '14px',
                                border: '1px solid #fed7aa',
                            }}>
                                <label style={{
                                    display: 'block', fontSize: '0.78rem', fontWeight: 700,
                                    color: '#9a3412', marginBottom: '8px',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    Efectivo recibido
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    value={pagoCon}
                                    onChange={(e) => setPagoCon(e.target.value)}
                                    placeholder="0.00"
                                    className="pos-input"
                                    style={{
                                        width: '100%', padding: '14px',
                                        fontSize: '1.6rem', textAlign: 'center',
                                        borderRadius: '12px', border: '2px solid #fb923c',
                                        fontWeight: 900, color: '#9a3412',
                                        fontVariantNumeric: 'tabular-nums',
                                        outline: 'none', marginBottom: '12px',
                                        transition: 'border-color .15s, box-shadow .15s',
                                    }}
                                />
                                <div style={{
                                    padding: '12px 14px', backgroundColor: 'white',
                                    borderRadius: '10px', border: '1px solid #fed7aa',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '0.78rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Resto por transferencia
                                    </span>
                                    <span style={{
                                        fontSize: '1.3rem', fontWeight: 900, color: '#ea580c',
                                        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                                    }}>
                                        {money(Math.max(0, cartTotal - pagoNumerico))}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button
                                onClick={() => { setShowPaymentModal(false); setPaymentMethod('efectivo'); setPagoCon(''); }}
                                className="pos-btn"
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    border: '1.5px solid #e2e8f0', backgroundColor: 'white',
                                    color: '#64748b', fontWeight: 800, fontSize: '0.9rem',
                                    cursor: 'pointer',
                                }}>
                                Cancelar
                            </button>
                            <button
                                onClick={processSale}
                                className="pos-btn"
                                style={{
                                    flex: 1.4, padding: '14px', borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                                    color: 'white', fontWeight: 900, fontSize: '0.9rem',
                                    letterSpacing: '0.03em', cursor: 'pointer',
                                    boxShadow: '0 6px 16px -4px rgba(5,150,105,.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}>
                                <Icon name="check" size={16} /> Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && <Toast toast={toast} />}
        </div>
    );
}
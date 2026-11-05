import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { JSX, ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Periodo = 'dia' | 'semana' | 'mes';
type Divisa = 'USD' | 'EUR' | 'MLC';
type Tab = 'ventas' | 'mermas' | 'gastos';

interface Tasas { rateUSD: number; rateEUR: number; rateMLC: number; }
interface Venta { id?: number; date: string; productName: string; quantity: number; unit: string; total: number; profit: number; }
interface Merma { id?: number; date: string; productName: string; quantity: number; unit: string; costLost: number; motivo?: string; }
interface Gasto { id?: number; date: string; description: string; category: string; amount: number; }
interface CajaData { ventas: Venta[]; mermas: Merma[]; gastos: Gasto[]; }

const TASAS_DEFAULT: Tasas = { rateUSD: 0, rateEUR: 0, rateMLC: 0 };
const CAJA_VACIA: CajaData = { ventas: [], mermas: [], gastos: [] };

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const getTodayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const money = (v: number): string => `$${v.toFixed(v % 1 === 0 ? 0 : 2)}`;
const formatHora = (iso: string): string =>
    new Date(iso).toLocaleTimeString('es-CU', { hour: '2-digit', minute: '2-digit' });

const startOfWeek = (d: Date): Date => {
    const r = new Date(d);
    const day = r.getDay();
    r.setDate(r.getDate() + ((day === 0 ? -6 : 1) - day));
    r.setHours(0, 0, 0, 0);
    return r;
};

const isInPeriod = (dateStr: string, fecha: string, periodo: Periodo): boolean => {
    if (periodo === 'dia') return dateStr.startsWith(fecha);
    if (periodo === 'mes') return dateStr.startsWith(fecha.substring(0, 7));
    const start = startOfWeek(new Date(fecha));
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    const d = new Date(dateStr);
    return d >= start && d <= end;
};

const useIsMobile = (breakpoint = 900): boolean => {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [breakpoint]);
    return isMobile;
};

// ═══════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════
type IconKey = 'back' | 'money' | 'trendUp' | 'trendDown' | 'wallet' | 'star' | 'chart' | 'cart' | 'package' | 'calendar' | 'calc' | 'swap' | 'inbox';

const Icon = ({ name, size = 20 }: { name: IconKey; size?: number }) => {
    const p: Record<IconKey, JSX.Element> = {
        back: <path d="m15 18-6-6 6-6" />,
        money: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-.6-1.3-.9-2.4-.9-1.4 0-2.3.7-2.3 1.7 0 2.7 5 1.2 5 4 0 1-.9 1.7-2.4 1.7-1.1 0-2-.3-2.6-1M12 6.8v10.4" /></>,
        trendUp: <><path d="M3 17 9 11l4 4 8-9" /><path d="M16 6h5v5" /></>,
        trendDown: <><path d="M3 7 9 13l4-4 8 9" /><path d="M16 18h5v-5" /></>,
        wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
        star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
        chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
        cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="19" cy="20" r="1.5" /><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.5L21 8H6" /></>,
        package: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21" /></>,
        calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M16 3v4M8 3v4M3.5 10h17" /></>,
        calc: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01" /></>,
        swap: <><path d="M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" /></>,
        inbox: <><path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7" /><path d="M2 13h4l2 3h8l2-3h4" /><path d="M4 13v6h16v-6" /></>,
    };
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {p[name]}
        </svg>
    );
};

// ═══════════════════════════════════════════════════════════
// SHARED STYLES / ANIMATIONS
// ═══════════════════════════════════════════════════════════
const GlobalStyles = () => (
    <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .caja-card-anim { animation: fadeUp .35s ease both; }
    .caja-skeleton {
      background: linear-gradient(90deg, #eef2f7 0%, #f6f9fc 50%, #eef2f7 100%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: 12px;
    }
    .caja-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .caja-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    .caja-scroll::-webkit-scrollbar-track { background: transparent; }
    .caja-tab { transition: all .18s ease; }
    .caja-tab:active { transform: scale(.97); }
    .caja-item:hover { background: #f8fafc; }
    input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .6; }
  `}</style>
);

const inputReset = {
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#0f172a',
    backgroundColor: 'transparent',
    cursor: 'pointer',
} as const;

// ═══════════════════════════════════════════════════════════
// SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════

interface KPICardProps {
    icon: IconKey;
    label: string;
    value: string;
    color: string;
    bg: string;
    highlight?: boolean;
    spanFull?: boolean;
}

const KPICard = ({ icon, label, value, color, bg, highlight, spanFull }: KPICardProps) => (
    <div className="caja-card-anim" style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 16px',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: highlight ? `2px solid ${color}` : '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: highlight
            ? `0 10px 30px -10px ${color}80`
            : '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 20px -8px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        gridColumn: spanFull ? 'span 2' : undefined,
    }}>
        {highlight && (
            <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 120, height: 120,
                background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                backgroundColor: bg, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon name={icon} size={18} />
            </div>
            <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase',
            }}>{label}</span>
        </div>
        <div style={{
            fontSize: highlight ? '1.55rem' : '1.35rem',
            fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
        }}>{value}</div>
    </div>
);

const PeriodSelector = ({ value, onChange }: { value: Periodo; onChange: (v: Periodo) => void }) => {
    const opts: { id: Periodo; label: string }[] = [
        { id: 'dia', label: 'Hoy' },
        { id: 'semana', label: 'Semana' },
        { id: 'mes', label: 'Mes' },
    ];
    return (
        <div style={{
            display: 'inline-flex',
            padding: '4px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: '12px',
            gap: '2px',
            backdropFilter: 'blur(6px)',
        }}>
            {opts.map(o => (
                <button key={o.id} className="caja-tab" onClick={() => onChange(o.id)} style={{
                    ...inputReset,
                    padding: '8px 14px',
                    borderRadius: '9px',
                    backgroundColor: value === o.id ? 'white' : 'transparent',
                    color: value === o.id ? '#047857' : 'rgba(255,255,255,0.92)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: value === o.id ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}>{o.label}</button>
            ))}
        </div>
    );
};

const DateButton = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <label style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
    }}>
        <Icon name="calendar" size={16} />
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                ...inputReset,
                color: 'white',
                fontSize: '0.85rem',
                colorScheme: 'dark',
                width: '130px',
            }}
        />
    </label>
);

// ✨ Añadido `compact` para versión pequeña
interface ConverterProps {
    amount: string;
    currency: Divisa;
    rate: number;
    onAmountChange: (v: string) => void;
    onCurrencyChange: (v: Divisa) => void;
    compact?: boolean;
}

const Converter = ({ amount, currency, rate, onAmountChange, onCurrencyChange, compact }: ConverterProps) => {
    const result = (parseFloat(amount) || 0) * (rate > 0 ? rate : 0);
    const pad = compact ? '12px' : '16px';
    return (
        <div className="caja-card-anim" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? '8px' : '10px',
            padding: pad,
            borderRadius: compact ? '14px' : '16px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #fbbf24',
            boxShadow: '0 8px 24px -8px rgba(251, 191, 36, 0.4)',
            height: '100%',
            boxSizing: 'border-box',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e' }}>
                <Icon name="calc" size={compact ? 14 : 16} />
                <span style={{
                    fontSize: compact ? '0.65rem' : '0.7rem',
                    fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                    Conversor rápido
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0.00"
                    style={{
                        ...inputReset,
                        flex: 1, minWidth: 0,
                        padding: compact ? '8px 10px' : '10px 12px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        fontSize: compact ? '0.9rem' : '1rem',
                        fontWeight: 700,
                        cursor: 'text',
                    }}
                />
                <select
                    value={currency}
                    onChange={(e) => onCurrencyChange(e.target.value as Divisa)}
                    style={{
                        ...inputReset,
                        padding: compact ? '8px 10px' : '10px 12px',
                        backgroundColor: 'white',
                        borderRadius: '10px',
                        fontSize: compact ? '0.82rem' : '0.9rem',
                        fontWeight: 800,
                        color: '#92400e',
                    }}
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="MLC">MLC</option>
                </select>
            </div>

            <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                paddingTop: '2px',
            }}>
                <span style={{ fontSize: compact ? '0.66rem' : '0.72rem', color: '#92400e', fontWeight: 600 }}>
                    {rate > 0 ? `1 ${currency} = ${rate} CUP` : 'Sin tasa configurada'}
                </span>
                <span style={{
                    fontSize: compact ? '1.1rem' : '1.35rem',
                    fontWeight: 900,
                    color: '#78350f',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                }}>
                    {rate > 0 ? money(result) : '—'}
                </span>
            </div>
        </div>
    );
};

const EquivalenceCard = ({
    flag, label, value, rateLabel, color, compact,
}: {
    flag: string; label: string; value: string; rateLabel: string; color: string; compact?: boolean;
}) => (
    <div className="caja-card-anim" style={{
        padding: compact ? '10px 12px' : '14px 16px',
        backgroundColor: 'white',
        borderRadius: compact ? '12px' : '16px',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 20px -8px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        minWidth: compact ? '110px' : '130px',
        flexShrink: 0,
        boxSizing: 'border-box',
        height: '100%',
    }}>
        <div style={{
            fontSize: compact ? '0.62rem' : '0.7rem',
            color: '#64748b', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
            {flag} {label}
        </div>
        <div style={{
            fontSize: compact ? '1rem' : '1.2rem', fontWeight: 800, color,
            marginTop: '4px', fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
        }}>{value}</div>
        <div style={{ fontSize: compact ? '0.6rem' : '0.68rem', color: '#94a3b8', marginTop: '2px' }}>{rateLabel}</div>
    </div>
);

const EmptyState = ({ icon, title, subtitle }: { icon: IconKey; title: string; subtitle?: string }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px', gap: '10px', color: '#94a3b8',
    }}>
        <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#cbd5e1',
        }}>
            <Icon name={icon} size={24} />
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{subtitle}</div>}
        </div>
    </div>
);

const ListRow = ({
    title, meta, amount, amountColor, accent,
}: {
    title: string; meta: string; amount: string; amountColor: string; accent: string;
}) => (
    <div className="caja-item" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 14px',
        borderLeft: `3px solid ${accent}`,
        borderRadius: '10px',
        backgroundColor: '#fafbfc',
        marginBottom: '8px',
        transition: 'background .15s ease',
    }}>
        <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{meta}</div>
        </div>
        <div style={{
            fontWeight: 800, color: amountColor, fontSize: '0.95rem',
            fontVariantNumeric: 'tabular-nums', marginLeft: '12px', flexShrink: 0,
        }}>{amount}</div>
    </div>
);

interface ListPanelProps {
    title: string;
    icon: IconKey;
    count: number;
    accent: string;
    total: string;
    emptyText: string;
    emptyIcon: IconKey;
    children: ReactNode; // ✨ fix: React.ReactNode → ReactNode
}

const ListPanel = ({ title, icon, count, accent, total, emptyText, emptyIcon, children }: ListPanelProps) => (
    <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        borderRadius: '16px',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 20px -8px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#fafbfc',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '9px',
                    backgroundColor: `${accent}18`, color: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name={icon} size={16} />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{count} registro{count !== 1 ? 's' : ''}</div>
                </div>
            </div>
            <div style={{ fontWeight: 800, color: accent, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
                {total}
            </div>
        </div>
        <div className="caja-scroll" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            minHeight: 0,
        }}>
            {count === 0 ? <EmptyState icon={emptyIcon} title={emptyText} /> : children}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function Caja() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [periodo, setPeriodo] = useState<Periodo>('dia');
    const [fecha, setFecha] = useState<string>(getTodayLocalString());
    const [convAmount, setConvAmount] = useState('');
    const [convCurrency, setConvCurrency] = useState<Divisa>('USD');
    const [activeTab, setActiveTab] = useState<Tab>('ventas');
    const [convOpen, setConvOpen] = useState(true); // ✨ colapsable en móvil

    const tasas: Tasas = useLiveQuery(async (): Promise<Tasas> => {
        const s = await db.settings.get(1);
        if (!s) return TASAS_DEFAULT;
        return { rateUSD: s.rateUSD, rateEUR: s.rateEUR, rateMLC: s.rateMLC };
    }, []) ?? TASAS_DEFAULT;

    const data: CajaData | undefined = useLiveQuery(async () => {
        try {
            const [sales, wastes, expenses] = await Promise.all([
                db.sales.toArray(), db.wastes.toArray(), db.expenses.toArray(),
            ]);
            const f = (r: { date: string }) => isInPeriod(r.date, fecha, periodo);
            return {
                ventas: sales.filter(f).reverse(),
                mermas: wastes.filter(f).reverse(),
                gastos: expenses.filter(f).reverse(),
            } as CajaData;
        } catch (err) {
            console.error('[Caja]', err);
            return CAJA_VACIA;
        }
    }, [periodo, fecha]);

    const loading = data === undefined;
    const d = data ?? CAJA_VACIA;

    const totals = useMemo(() => {
        const ingresos = d.ventas.reduce((s, v) => s + v.total, 0);
        const gananciaBruta = d.ventas.reduce((s, v) => s + v.profit, 0);
        const totalMermas = d.mermas.reduce((s, m) => s + m.costLost, 0);
        const totalGastos = d.gastos.reduce((s, g) => s + g.amount, 0);
        return { ingresos, gananciaBruta, totalMermas, totalGastos, gananciaNeta: gananciaBruta - totalMermas - totalGastos };
    }, [d]);

    const convRate = convCurrency === 'USD' ? tasas.rateUSD : convCurrency === 'EUR' ? tasas.rateEUR : tasas.rateMLC;
    const hayEquivalencias = tasas.rateUSD > 0 || tasas.rateEUR > 0 || tasas.rateMLC > 0;
    const convResult = convRate > 0 ? money((parseFloat(convAmount) || 0) * convRate) : '—';

    const renderVentas = () => d.ventas.length === 0 ? null : d.ventas.map(v => (
        <ListRow key={v.id} title={v.productName}
            meta={`${formatHora(v.date)} · ${v.quantity.toFixed(2)} ${v.unit}`}
            amount={money(v.total)} amountColor="#059669" accent="#10b981" />
    ));
    const renderMermas = () => d.mermas.length === 0 ? null : d.mermas.map(m => (
        <ListRow key={m.id} title={m.productName}
            meta={`${formatHora(m.date)} · ${m.quantity.toFixed(2)} ${m.unit}${m.motivo ? ` · ⚠️ ${m.motivo}` : ''}`}
            amount={`-${money(m.costLost)}`} amountColor="#dc2626" accent="#ef4444" />
    ));
    const renderGastos = () => d.gastos.length === 0 ? null : d.gastos.map(g => (
        <ListRow key={g.id} title={g.description}
            meta={`${formatHora(g.date)} · ${g.category}`}
            amount={`-${money(g.amount)}`} amountColor="#7c3aed" accent="#a855f7" />
    ));

    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}>
            <GlobalStyles />

            {/* ═════════ HEADER ═════════ */}
            <header style={{
                background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10b981 100%)',
                padding: isMobile ? '14px 16px' : '16px 24px',
                boxShadow: '0 4px 24px -6px rgba(5, 150, 105, 0.4)',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '14px',
                flexShrink: 0,
                zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: isMobile ? 1 : 'initial' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            color: 'white', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        <Icon name="back" size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Icon name="money" size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                                Cierre de Caja
                            </div>
                            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
                                Resumen financiero
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    marginLeft: 'auto',
                }}>
                    <PeriodSelector value={periodo} onChange={setPeriodo} />
                    <DateButton value={fecha} onChange={setFecha} />
                </div>
            </header>

            {/* ═════════ CONTENIDO SCROLLABLE ═════════ */}
            <div className="caja-scroll" style={{
                flex: 1, overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
            }}>

                {/* KPIs */}
                <section style={{ padding: isMobile ? '14px 14px 0' : '20px 24px 0', flexShrink: 0 }}>
                    {loading ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                            gap: '12px',
                        }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="caja-skeleton" style={{
                                    height: '92px',
                                    gridColumn: isMobile && i === 4 ? 'span 2' : undefined,
                                }} />
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                            gap: isMobile ? '10px' : '14px',
                        }}>
                            <KPICard icon="trendUp" label="Ingresos" value={money(totals.ingresos)} color="#059669" bg="#ecfdf5" />
                            <KPICard icon="chart" label="G. Bruta" value={money(totals.gananciaBruta)} color="#2563eb" bg="#eff6ff" />
                            <KPICard icon="trendDown" label="Mermas" value={`-${money(totals.totalMermas)}`} color="#dc2626" bg="#fef2f2" />
                            <KPICard icon="wallet" label="Gastos" value={`-${money(totals.totalGastos)}`} color="#7c3aed" bg="#f5f3ff" />
                            <KPICard icon="star" label="G. Neta" value={money(totals.gananciaNeta)}
                                color="#ea580c" bg="#fff7ed" highlight spanFull={isMobile} />
                        </div>
                    )}
                </section>

                {/* ═════════════ LISTAS (contenido principal) ═════════════ */}
                <section style={{
                    // ✨ Móvil: altura natural (no colapsa). Desktop/tablet: crece pero nunca baja de 360px
                    flex: isMobile ? '0 0 auto' : 1,
                    minHeight: isMobile ? undefined : 360,
                    padding: isMobile ? '14px' : '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {isMobile ? (
                        <>
                            <div style={{
                                display: 'flex', gap: '6px', marginBottom: '12px',
                                padding: '4px', backgroundColor: '#eef2f7',
                                borderRadius: '14px', flexShrink: 0,
                            }}>
                                {([
                                    { id: 'ventas' as Tab, label: 'Ventas', count: d.ventas.length, color: '#059669' },
                                    { id: 'mermas' as Tab, label: 'Mermas', count: d.mermas.length, color: '#dc2626' },
                                    { id: 'gastos' as Tab, label: 'Gastos', count: d.gastos.length, color: '#7c3aed' },
                                ]).map(t => {
                                    const active = activeTab === t.id;
                                    return (
                                        <button key={t.id} className="caja-tab" onClick={() => setActiveTab(t.id)} style={{
                                            ...inputReset, flex: 1,
                                            padding: '10px 6px',
                                            borderRadius: '10px',
                                            backgroundColor: active ? 'white' : 'transparent',
                                            color: active ? t.color : '#64748b',
                                            fontWeight: 800,
                                            fontSize: '0.82rem',
                                            boxShadow: active ? '0 2px 8px rgba(15,23,42,0.08)' : 'none',
                                        }}>
                                            {t.label}
                                            <span style={{
                                                marginLeft: '6px',
                                                padding: '1px 7px',
                                                borderRadius: '20px',
                                                backgroundColor: active ? `${t.color}18` : '#e2e8f0',
                                                color: active ? t.color : '#64748b',
                                                fontSize: '0.7rem',
                                            }}>{t.count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div>
                                {activeTab === 'ventas' && (
                                    d.ventas.length === 0
                                        ? <EmptyState icon="cart" title="Sin ventas registradas" subtitle="Las ventas del período aparecerán aquí." />
                                        : renderVentas()
                                )}
                                {activeTab === 'mermas' && (
                                    d.mermas.length === 0
                                        ? <EmptyState icon="trendDown" title="Sin mermas" subtitle="Perfecto, no hay pérdidas registradas." />
                                        : renderMermas()
                                )}
                                {activeTab === 'gastos' && (
                                    d.gastos.length === 0
                                        ? <EmptyState icon="wallet" title="Sin gastos" subtitle="No hay salidas de dinero en este período." />
                                        : renderGastos()
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', gap: '14px', flex: 1, minHeight: 0 }}>
                            <ListPanel title="Ventas" icon="cart" count={d.ventas.length}
                                accent="#059669" total={money(totals.ingresos)}
                                emptyText="Sin ventas en el período" emptyIcon="cart">
                                {renderVentas()}
                            </ListPanel>
                            <ListPanel title="Mermas" icon="trendDown" count={d.mermas.length}
                                accent="#dc2626" total={`-${money(totals.totalMermas)}`}
                                emptyText="Sin mermas en el período" emptyIcon="inbox">
                                {renderMermas()}
                            </ListPanel>
                            <ListPanel title="Gastos" icon="wallet" count={d.gastos.length}
                                accent="#7c3aed" total={`-${money(totals.totalGastos)}`}
                                emptyText="Sin gastos en el período" emptyIcon="wallet">
                                {renderGastos()}
                            </ListPanel>
                        </div>
                    )}
                </section>

                {/* ═════════════ CONVERSOR + EQUIVALENCIAS (al fondo) ═════════════ */}
                <section style={{
                    flexShrink: 0,
                    padding: isMobile ? '0 14px 20px' : '0 24px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    borderTop: '1px dashed #e2e8f0',
                    paddingTop: isMobile ? '14px' : '20px',
                    marginTop: isMobile ? '0' : '4px',
                }}>
                    {/* Título solo en desktop */}
                    {!isMobile && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '0.7rem', fontWeight: 800,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: '#94a3b8',
                        }}>
                            <Icon name="swap" size={14} />
                            Herramientas de cambio
                        </div>
                    )}

                    {isMobile ? (
                        <>
                            {/* ✨ Barra colapsable compacta */}
                            <button
                                onClick={() => setConvOpen(o => !o)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    width: '100%', padding: '10px 14px',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #fbbf24',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    boxShadow: '0 4px 12px -6px rgba(251,191,36,0.4)',
                                }}
                            >
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.78rem', fontWeight: 800, color: '#92400e',
                                }}>
                                    <Icon name="swap" size={14} /> Conversor rápido
                                </span>
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.85rem', fontWeight: 800, color: '#78350f',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {convResult}
                                    <span style={{
                                        display: 'inline-block',
                                        transform: convOpen ? 'rotate(180deg)' : 'none',
                                        transition: 'transform .2s',
                                        fontSize: '0.7rem',
                                    }}>▾</span>
                                </span>
                            </button>

                            {convOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Converter compact amount={convAmount} currency={convCurrency} rate={convRate}
                                        onAmountChange={setConvAmount} onCurrencyChange={setConvCurrency} />
                                    {hayEquivalencias && (
                                        <div className="caja-scroll" style={{
                                            display: 'flex', gap: '8px', overflowX: 'auto',
                                            margin: '0 -14px', padding: '0 14px 4px',
                                        }}>
                                            {tasas.rateUSD > 0 && <EquivalenceCard compact flag="💵" label="USD" color="#0d47a1"
                                                value={`$${(totals.ingresos / tasas.rateUSD).toFixed(2)}`}
                                                rateLabel={`${tasas.rateUSD} CUP/USD`} />}
                                            {tasas.rateEUR > 0 && <EquivalenceCard compact flag="💶" label="EUR" color="#00897b"
                                                value={`€${(totals.ingresos / tasas.rateEUR).toFixed(2)}`}
                                                rateLabel={`${tasas.rateEUR} CUP/EUR`} />}
                                            {tasas.rateMLC > 0 && <EquivalenceCard compact flag="🏦" label="MLC" color="#c62828"
                                                value={(totals.ingresos / tasas.rateMLC).toFixed(2)}
                                                rateLabel={`${tasas.rateMLC} CUP/MLC`} />}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // ✨ Desktop/tablet: flex-wrap (nunca desborda, se adapta a anchos intermedios)
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'stretch' }}>
                            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                                <Converter amount={convAmount} currency={convCurrency} rate={convRate}
                                    onAmountChange={setConvAmount} onCurrencyChange={setConvCurrency} />
                            </div>
                            {tasas.rateUSD > 0 && (
                                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                                    <EquivalenceCard flag="💵" label="Total USD" color="#0d47a1"
                                        value={`$${(totals.ingresos / tasas.rateUSD).toFixed(2)}`}
                                        rateLabel={`${tasas.rateUSD} CUP/USD`} />
                                </div>
                            )}
                            {tasas.rateEUR > 0 && (
                                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                                    <EquivalenceCard flag="💶" label="Total EUR" color="#00897b"
                                        value={`€${(totals.ingresos / tasas.rateEUR).toFixed(2)}`}
                                        rateLabel={`${tasas.rateEUR} CUP/EUR`} />
                                </div>
                            )}
                            {tasas.rateMLC > 0 && (
                                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                                    <EquivalenceCard flag="🏦" label="Total MLC" color="#c62828"
                                        value={(totals.ingresos / tasas.rateMLC).toFixed(2)}
                                        rateLabel={`${tasas.rateMLC} CUP/MLC`} />
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
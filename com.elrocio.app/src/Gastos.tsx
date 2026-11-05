import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { JSX } from 'react';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Periodo = 'dia' | 'semana' | 'mes';
type Categoria = 'casa' | 'transporte' | 'multa' | 'otro';

interface Gasto {
    id?: number;
    date: string;
    description: string;
    category: string;
    amount: number;
}

const CATEGORIAS: Categoria[] = ['casa', 'transporte', 'multa', 'otro'];
const CATEGORIA_LABELS: Record<Categoria, string> = {
    casa: 'Casa', transporte: 'Transporte', multa: 'Multa', otro: 'Otro',
};
const GASTOS_VACIOS: Gasto[] = [];

// ═══════════════════════════════════════════════════════════
// UTILS (igual que antes)
// ═══════════════════════════════════════════════════════════
const getTodayLocalString = (): string => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const money = (v: number): string => `$${v.toFixed(v % 1 === 0 ? 0 : 2)}`;
const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('es-CU', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
// ICONS (igual)
// ═══════════════════════════════════════════════════════════
type IconKey = 'back' | 'trash' | 'wallet' | 'calendar' | 'plus' | 'close' | 'inbox';

const Icon = ({ name, size = 20 }: { name: IconKey; size?: number }) => {
    const p: Record<IconKey, JSX.Element> = {
        back: <path d="m15 18-6-6 6-6" />,
        trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></>,
        wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
        calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M16 3v4M8 3v4M3.5 10h17" /></>,
        plus: <><path d="M12 5v14M5 12h14" /></>,
        close: <><path d="m6 6 12 12M18 6 6 18" /></>,
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
// SHARED STYLES (igual)
// ═══════════════════════════════════════════════════════════
const GlobalStyles = () => (
    <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .gastos-anim { animation: fadeUp .35s ease both; }
    .gastos-skeleton {
      background: linear-gradient(90deg, #eef2f7 0%, #f6f9fc 50%, #eef2f7 100%);
      background-size: 800px 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: 12px;
    }
    .gastos-tab { transition: all .18s ease; }
    .gastos-tab:active { transform: scale(.97); }
    .gastos-item:hover { background: #f8fafc; }
    .gastos-input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px rgba(5,150,105,.15) !important; }
    input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .8; }
  `}</style>
);

const inputReset = {
    border: 'none', outline: 'none', fontFamily: 'inherit',
    backgroundColor: 'transparent', cursor: 'pointer',
} as const;

const labelStyle = {
    display: 'flex', flexDirection: 'column' as const, gap: '6px',
    fontSize: '0.8rem', fontWeight: 700, color: '#475569',
};
const fieldStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '0.95rem',
    outline: 'none', backgroundColor: 'white',
    fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
} as const;

// ═══════════════════════════════════════════════════════════
// SUBCOMPONENTS (igual)
// ═══════════════════════════════════════════════════════════
const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '50px 20px', gap: '12px', color: '#94a3b8',
    }}>
        <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: '#f1f5f9', color: '#cbd5e1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Icon name="inbox" size={24} />
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{subtitle}</div>}
        </div>
    </div>
);

const PeriodSelector = ({ value, onChange }: { value: Periodo; onChange: (v: Periodo) => void }) => {
    const opts: { id: Periodo; label: string }[] = [
        { id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' },
    ];
    return (
        <div style={{
            display: 'inline-flex', padding: '4px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            borderRadius: '12px', gap: '2px', backdropFilter: 'blur(6px)',
        }}>
            {opts.map(o => (
                <button key={o.id} className="gastos-tab" onClick={() => onChange(o.id)} style={{
                    ...inputReset, padding: '8px 14px', borderRadius: '9px',
                    backgroundColor: value === o.id ? 'white' : 'transparent',
                    color: value === o.id ? '#047857' : 'rgba(255,255,255,0.92)',
                    fontSize: '0.85rem', fontWeight: 700,
                    boxShadow: value === o.id ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}>{o.label}</button>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════
// ✨ FORM — AHORA FUERA DEL COMPONENTE PADRE
// ═══════════════════════════════════════════════════════════
interface FormProps {
    compact?: boolean;
    descripcion: string;
    setDescripcion: (v: string) => void;
    monto: string;
    setMonto: (v: string) => void;
    categoria: Categoria;
    setCategoria: (v: Categoria) => void;
    onSubmit: (e: FormEvent) => void;
}

const GastoForm = ({
    compact, descripcion, setDescripcion, monto, setMonto,
    categoria, setCategoria, onSubmit,
}: FormProps) => (
    <form onSubmit={onSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        padding: compact ? '0' : '20px',
        backgroundColor: compact ? 'transparent' : 'white',
        borderRadius: compact ? 0 : '16px',
        border: compact ? 'none' : '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: compact ? 'none' : '0 1px 2px rgba(15,23,42,.04), 0 8px 20px -8px rgba(15,23,42,.06)',
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
            <div style={{
                width: '30px', height: '30px', borderRadius: '9px',
                backgroundColor: '#ecfdf5', color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon name="plus" size={16} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Nuevo Gasto</span>
        </div>

        <label style={labelStyle}>
            Descripción
            <input className="gastos-input" required value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Pasaje al mercado"
                style={fieldStyle} />
        </label>

        <label style={labelStyle}>
            Monto
            <input className="gastos-input" required type="number" inputMode="decimal"
                step="0.01" min="0.01" value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                style={{ ...fieldStyle, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }} />
        </label>

        <label style={labelStyle}>
            Categoría
            <select className="gastos-input" value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                style={fieldStyle}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>)}
            </select>
        </label>

        <button type="submit" style={{
            padding: '14px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
            boxShadow: '0 4px 12px -2px rgba(5, 150, 105, 0.4)',
            transition: 'transform .15s, box-shadow .15s',
        }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
            Agregar Gasto
        </button>
    </form>
);

// ═══════════════════════════════════════════════════════════
// ✨ LISTA — TAMBIÉN FUERA
// ═══════════════════════════════════════════════════════════
interface ListaProps {
    loading: boolean;
    lista: Gasto[];
    onDelete: (id: number) => void;
}

const GastoLista = ({ loading, lista, onDelete }: ListaProps) => (
    <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        backgroundColor: 'white', borderRadius: '16px',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 20px -8px rgba(15,23,42,.06)',
        overflow: 'hidden', minHeight: 0,
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafbfc',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '9px',
                    backgroundColor: '#f5f3ff', color: '#7c3aed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name="wallet" size={16} />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Gastos del período</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        {lista.length} registro{lista.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="gastos-skeleton" style={{ height: '64px', marginBottom: '10px' }} />
                ))
            ) : lista.length === 0 ? (
                <EmptyState title="Sin gastos registrados"
                    subtitle="Usa el formulario para agregar uno." />
            ) : lista.map(g => (
                <div key={g.id} className="gastos-item" style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', backgroundColor: 'white', borderRadius: '12px',
                    border: '1px solid rgba(15,23,42,0.06)',
                    borderLeft: '4px solid #a855f7',
                    marginBottom: '10px', transition: 'background .15s ease',
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                            🏷️ {g.category.charAt(0).toUpperCase() + g.category.slice(1)} · 📅 {formatDate(g.date)} · ⏰ {formatHora(g.date)}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <strong style={{ color: '#dc2626', fontSize: '1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            -{money(g.amount)}
                        </strong>
                        <button onClick={() => onDelete(g.id!)} style={{
                            width: '34px', height: '34px', borderRadius: '10px',
                            border: 'none', backgroundColor: '#f8fafc', color: '#94a3b8',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s ease',
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <Icon name="trash" size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
export default function Gastos() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [categoria, setCategoria] = useState<Categoria>('casa');
    const [periodo, setPeriodo] = useState<Periodo>('dia');
    const [fecha, setFecha] = useState<string>(getTodayLocalString());
    const [formOpen, setFormOpen] = useState(false);

    const gastos: Gasto[] | undefined = useLiveQuery(async () => {
        try {
            const all = await db.expenses.toArray();
            return all
                .filter((g) => isInPeriod(g.date, fecha, periodo))
                .reverse() as Gasto[];
        } catch (e) {
            console.error('[Gastos]', e);
            return GASTOS_VACIOS;
        }
    }, [fecha, periodo]);

    const loading = gastos === undefined;
    const lista = gastos ?? GASTOS_VACIOS;
    const total = useMemo(() => lista.reduce((s, g) => s + g.amount, 0), [lista]);

    const agregarGasto = async (e: FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(monto);
        if (!descripcion.trim() || isNaN(amount) || amount <= 0) return;

        await db.expenses.add({
            category: categoria,
            description: descripcion.trim(),
            amount,
            date: new Date().toISOString(),
        });

        setDescripcion('');
        setMonto('');
        setCategoria('casa');
        if (isMobile) setFormOpen(false);
    };

    const eliminarGasto = async (id: number) => {
        if (!window.confirm('¿Eliminar este gasto?')) return;
        await db.expenses.delete(id);
    };

    // ══════════ RENDER ══════════
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            backgroundColor: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}>
            <GlobalStyles />

            {/* HEADER */}
            <header style={{
                background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10b981 100%)',
                padding: '14px 16px',
                boxShadow: '0 4px 24px -6px rgba(5, 150, 105, 0.4)',
                display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '12px', flexShrink: 0, zIndex: 20,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate('/')} style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(6px)', flexShrink: 0,
                    }}>
                        <Icon name="back" size={20} />
                    </button>
                    <div style={{ color: 'white', flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1 }}>Gastos</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Control de egresos</div>
                    </div>
                    {isMobile && (
                        <button onClick={() => setFormOpen(true)} style={{
                            padding: '10px 14px', borderRadius: '12px', border: 'none',
                            backgroundColor: 'white', color: '#047857',
                            fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            <Icon name="plus" size={16} /> Nuevo
                        </button>
                    )}
                </div>

                <div style={{
                    display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap',
                    marginLeft: isMobile ? 0 : 'auto',
                }}>
                    <PeriodSelector value={periodo} onChange={setPeriodo} />
                    <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.18)',
                        borderRadius: '12px', color: 'white', cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                    }}>
                        <Icon name="calendar" size={16} />
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                            style={{ ...inputReset, color: 'white', fontSize: '0.85rem', colorScheme: 'dark', width: '120px' }} />
                    </label>
                </div>
            </header>

            {/* TOTAL */}
            <div style={{
                margin: '14px 14px 0', padding: '18px 20px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                border: '1px solid #fecaca',
                boxShadow: '0 8px 24px -10px rgba(220, 38, 38, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#991b1b', textTransform: 'uppercase' }}>
                        Total {periodo}
                    </div>
                    <div style={{
                        fontSize: '1.8rem', fontWeight: 900, color: '#991b1b',
                        letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                    }}>{money(total)}</div>
                </div>
                <div style={{
                    width: '46px', height: '46px', borderRadius: '12px',
                    backgroundColor: '#fee2e2', color: '#dc2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon name="wallet" size={22} />
                </div>
            </div>

            {/* CONTENIDO */}
            <div style={{
                flex: 1, display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '14px', padding: '14px', overflow: 'hidden',
            }}>
                {!isMobile && (
                    <div style={{ width: '340px', flexShrink: 0, overflowY: 'auto' }}>
                        <GastoForm
                            descripcion={descripcion} setDescripcion={setDescripcion}
                            monto={monto} setMonto={setMonto}
                            categoria={categoria} setCategoria={setCategoria}
                            onSubmit={agregarGasto}
                        />
                    </div>
                )}
                <GastoLista loading={loading} lista={lista} onDelete={eliminarGasto} />
            </div>

            {/* MODAL FORM MÓVIL */}
            {isMobile && formOpen && (
                <div onClick={() => setFormOpen(false)} style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    display: 'flex', alignItems: 'flex-end', zIndex: 100,
                }}>
                    <div onClick={(e) => e.stopPropagation()} style={{
                        width: '100%', backgroundColor: 'white',
                        borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                        padding: '20px 16px 24px', maxHeight: '90vh', overflowY: 'auto',
                        animation: 'fadeUp .3s ease', position: 'relative',
                    }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#cbd5e1', margin: '0 auto 16px' }} />
                        <button onClick={() => setFormOpen(false)} style={{
                            position: 'absolute', top: '16px', right: '16px',
                            width: '34px', height: '34px', borderRadius: '10px',
                            border: 'none', backgroundColor: '#f1f5f9', color: '#64748b',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Icon name="close" size={18} />
                        </button>
                        <GastoForm
                            compact
                            descripcion={descripcion} setDescripcion={setDescripcion}
                            monto={monto} setMonto={setMonto}
                            categoria={categoria} setCategoria={setCategoria}
                            onSubmit={agregarGasto}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
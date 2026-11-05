import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { db, Product } from './db';
import type { JSX, ReactNode } from 'react';


// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type IconName =
  | 'cart' | 'shelf' | 'meat' | 'warehouse' | 'plus' | 'calendar'
  | 'close' | 'trend' | 'box' | 'money' | 'check' | 'trash' | 'send'
  | 'minus' | 'edit' | 'download' | 'upload' | 'search' | 'file-text'
  | 'list' | 'menu' | 'wallet' | 'back';

type ActionType = 'venta' | 'merma' | 'entrada' | 'traspaso';
type CatalogType = 'simple' | 'detallado';
type ModuleId = 'carretilla' | 'estante' | 'carnicos' | 'almacen';

interface Module { id: ModuleId; label: string; icon: IconName; }
interface ToastData { msg: string; type: 'success' | 'error' | 'info'; }

type ModalState =
  | { kind: 'add'; editing?: Product }
  | { kind: 'action'; product: Product; actionType: ActionType }
  | { kind: 'backup' }
  | { kind: 'tasas' }
  | null;

interface ProductFormData {
  id?: number;
  name: string;
  stock: number;
  unit: string;
  cost: number;
  sale: number;
}

interface ActionPayload {
  quantity: number;
  wasteMotivo?: string;
  targetModule?: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const modules: Module[] = [
  { id: 'carretilla', label: 'Carretilla', icon: 'cart' },
  { id: 'estante', label: 'Estante', icon: 'shelf' },
  { id: 'carnicos', label: 'Cárnicos', icon: 'meat' },
  { id: 'almacen', label: 'Almacén', icon: 'warehouse' },
];

const unidades = ['unidades', 'libras', 'kilogramos', 'gramos', 'mazos', 'pomos', 'litros', 'mililitros'];

const MOTIVOS_MERMA = [
  'Se echó a perder',
  'Consumo en el hogar',
  'Dañado en transporte',
  'Venció',
  'Otro',
];

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════
const money = (v: number): string => `$${v.toFixed(v % 1 === 0 ? 0 : 2)}`;

const getTodayLocalString = (): string => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAgAElEQVR4Xu1dB7wV1dEfem / Se1GKiIAFaSogWEHFFlGjEUuSnxo1lpgvJrF90eQzGqPGGE1sqBiDXcHeAEF6ERDpvXeQ + njfzGk7e / ac3b3vPcy7sBev7717d0 + Zmf + 0M + dsGcheGQUOYQqUOYTnnk09owBkAMiE4JCmQAaAQ5r92eQzAGQycEhTIAPAIc3 + bPIZADIZOKQpkAHgkGZ / NvkMAJkMHNIUyABwSLM / m3wGgEwGDmkKZAA4pNmfTT4DQCYDhzQFMgAc0uzPJp8BIJOBQ5oCGQAOafZnk / +hAfBD95dxOP8oUPhDDvmHEEhfHz9E3z8kLbO + ik8BW / gPOBgOpBDabeu / 7Z + abAdyLMVnTdbCgaAAF3DX7 / qzAwaEAyV0vF363fUmgurPDwRxszZLPwVsoae / 7TfN4oAB4UAAgGt4LeBlSdgfffTRmpdddtk51atXH1C2bNmW + G6K7xaln0 / ZCA8UBfbv378U32vwvWLXrl0fjR079u2zzjprnRL6 / RYgOBhKZEglDQAu / CT04j137txuLVq0uKRSpUpDypQpU6dERp41clBSoLCwcNPOnTv / vXz58pfbt28 / ESdJINDvErcEJQkAl / CXmz17djecyHDU9E0OSo5lkzogFEAgbFmxYsXQ5s2bv68AUOBxj4rVf0kBwBb + cjiqcjiBixs3bvx31PqVijXK7OZDlQL7NmzY8Lt69eo9hgTYh28NArIIJeIOlQQAXMJfHoX / ShT++1H4ax6q3MvmXXwKoCXYumrVqjubNm36LAOBjg2KDYLiAsDl9pS / 4YYbav / 1r3 + dmLk9xReArAVMARUW7njuuedOuOqqq5YgPfZaMUGxUqQlBQAd8JbHwVXYuHHjn + vUqXNtxryMAiVFgS1btjxdu3bt2xQAyBWid7FdoZIAALVBACC / v8LQoUPr / Otf / 5qX + f0lxfqsHU2BZ555ptvVV1 / 9LQMBT5MWiVDFAYC + V2v / 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";
const useIsMobile = (bp = 900): boolean => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < bp);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [bp]);
  return isMobile;
};

// ═══════════════════════════════════════════════════════════
// ICON
// ═══════════════════════════════════════════════════════════
const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => {
  const p: Record<IconName, JSX.Element> = {
    back: <path d="m15 18-6-6 6-6" />,
    cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="19" cy="20" r="1.5" /><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.5L21 8H6" /><path d="M10 11h7M13.5 8v6" /></>,
    shelf: <><path d="M4 4h16v16H4z" /><path d="M4 10h16M4 16h16M9 4v6M15 10v6" /></>,
    meat: <><path d="M7.1 15.8c-2.7.1-4.2-1.2-3.8-3.2.3-1.5 1.6-2.5 3.1-2.8 1.1-.2 1.7-.8 2.2-1.8.8-1.7 2.2-2.7 4.3-2.7 3.1 0 5.5 2.6 5.5 5.7 0 2.2-1.3 4.2-3.2 5.2-1.9 1-3.8.5-4.9-.4-.9-.7-1.8-.1-3.2 0Z" /><circle cx="15.7" cy="10.4" r="1.1" /></>,
    warehouse: <><path d="M3 20V8l9-5 9 5v12" /><path d="M7 20v-7h10v7M4 20h16M10 13v7M14 13v7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M16 3v4M8 3v4M3.5 10h17" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    trend: <><path d="M3 17 9 11l4 4 8-9" /><path d="M16 6h5v5" /></>,
    box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21" /></>,
    money: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-.6-1.3-.9-2.4-.9-1.4 0-2.3.7-2.3 1.7 0 2.7 5 1.2 5 4 0 1-.9 1.7-2.4 1.7-1.1 0-2-.3-2.6-1M12 6.8v10.4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></>,
    send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></>,
    minus: <path d="M5 12h14" />,
    edit: <><path d="M11 4H4v16h16v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
    list: <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>,
    wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {p[name]}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═══════════════════════════════════════════════════════════
const GlobalStyles = () => (
  <style>{`
    @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes pop { 0% { transform: scale(.94); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    .app-anim { animation: fadeUp .3s ease both; }
    .app-sheet { animation: slideUp .32s cubic-bezier(.22,1,.36,1) both; }
    .app-pop { animation: pop .2s ease both; }
    .app-card { transition: transform .15s ease, box-shadow .2s ease; }
    .app-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -8px rgba(15,23,42,.15); }
    .app-btn { transition: all .15s ease; }
    .app-btn:active { transform: scale(.96); }
    .app-input:focus { border-color: #059669 !important; box-shadow: 0 0 0 3px rgba(5,150,105,.15) !important; }
    .app-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .app-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    .app-scroll::-webkit-scrollbar-track { background: transparent; }
    .app-nav-item { transition: all .18s ease; }
    .app-nav-item:active { transform: scale(.96); }
    .app-menu-item:hover { background: #f8fafc; }

    /* Tabla (tablet/desktop) */
    .prod-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .prod-table thead th {
      position: sticky; top: 0; z-index: 2;
      background: #f8fafc;
      padding: 12px 14px;
      font-size: 0.7rem; font-weight: 800;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: #64748b;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .prod-table tbody td {
      padding: 12px 14px;
      font-size: 0.88rem;
      color: #0f172a;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .prod-table tbody tr { transition: background .12s ease; }
    .prod-table tbody tr:hover { background: #f8fafc; }
    .prod-table tbody tr:last-child td { border-bottom: none; }
    .cell-btn {
      padding: 7px 12px; border-radius: 8px;
      font-size: 0.76rem; font-weight: 800;
      border: 1px solid transparent; cursor: pointer;
      transition: all .15s ease; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .cell-btn:active { transform: scale(.95); }
    .cell-btn.green { background: #ecfdf5; color: #059669; border-color: #a7f3d0; }
    .cell-btn.blue  { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .cell-btn.red   { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .cell-btn.orange{ background: #fff7ed; color: #ea580c; border-color: #fed7aa; }

    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type="number"] { -moz-appearance: textfield; }
    input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .8; }
  `}</style>
);

const inputReset = {
  border: 'none', outline: 'none', fontFamily: 'inherit',
  backgroundColor: 'transparent', cursor: 'pointer',
} as const;

const fieldStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e2e8f0', fontSize: '0.95rem',
  outline: 'none', backgroundColor: 'white',
  fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
} as const;

const labelStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: '6px',
  fontSize: '0.78rem', fontWeight: 700, color: '#475569',
  letterSpacing: '0.02em',
};

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
const Toast = ({ toast }: { toast: ToastData }) => {
  const c = {
    success: { bg: '#065f46', icon: 'check' as IconName },
    error: { bg: '#991b1b', icon: 'close' as IconName },
    info: { bg: '#1e40af', icon: 'money' as IconName },
  }[toast.type];
  return (
    <div className="app-pop" style={{
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

const Modal = ({ isMobile, onClose, children, maxWidth = 480 }: {
  isMobile: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15,23,42,.5)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: isMobile ? 0 : '20px',
    }}>
    <div
      onClick={(e) => e.stopPropagation()}
      className={isMobile ? 'app-sheet' : 'app-pop'}
      style={{
        backgroundColor: 'white',
        borderRadius: isMobile ? '24px 24px 0 0' : '20px',
        padding: '24px',
        maxWidth: isMobile ? '100%' : `${maxWidth}px`,
        width: '100%',
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
      {isMobile && (
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          backgroundColor: '#cbd5e1', margin: '0 auto 6px',
          flexShrink: 0,
        }} />
      )}
      {children}
    </div>
  </div>
);

const ModalHeader = ({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', lineHeight: 1.2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>{subtitle}</div>}
    </div>
    <button onClick={onClose} className="app-btn" style={{
      width: '32px', height: '32px', borderRadius: '9px',
      border: 'none', backgroundColor: '#f1f5f9', color: '#64748b',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon name="close" size={16} />
    </button>
  </div>
);

const EmptyState = ({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '10px', padding: '60px 20px',
    color: '#94a3b8', textAlign: 'center',
  }}>
    <div style={{
      width: '56px', height: '56px', borderRadius: '16px',
      backgroundColor: '#f1f5f9', color: '#cbd5e1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={icon} size={26} />
    </div>
    <div>
      <div style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════
interface MenuDropdownProps {
  onNavigate: (path: string) => void;
  onExportPDF: (tipo: CatalogType) => void;
  onOpenBackup: () => void;
  onOpenTasas: () => void;
}
const MenuDropdown = ({ onNavigate, onExportPDF, onOpenBackup, onOpenTasas }: MenuDropdownProps) => {
  const [open, setOpen] = useState(false);
  const itemStyle = {
    width: '100%', padding: '12px 14px', border: 'none', background: 'none',
    textAlign: 'left' as const, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '12px',
    borderRadius: '8px', fontSize: '0.9rem', color: '#334155', fontWeight: 600,
  };
  const close = () => setOpen(false);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className="app-btn" style={{
        width: '40px', height: '40px', borderRadius: '12px',
        backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}>
        <Icon name="menu" size={20} />
      </button>

      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
          <div className="app-pop" style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            backgroundColor: 'white', borderRadius: '14px',
            boxShadow: '0 12px 32px -8px rgba(15,23,42,.25)',
            padding: '6px', minWidth: '250px', zIndex: 99,
            border: '1px solid rgba(15,23,42,.06)',
          }}>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onNavigate('/carrito'); close(); }}>
              <span style={{ color: '#f57c00' }}><Icon name="cart" size={18} /></span> Ventas Rápidas
            </button>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onNavigate('/historial'); close(); }}>
              <span style={{ color: '#1565c0' }}><Icon name="list" size={18} /></span> Historial
            </button>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onNavigate('/caja'); close(); }}>
              <span style={{ color: '#2e7d32' }}><Icon name="money" size={18} /></span> Caja
            </button>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onNavigate('/gastos'); close(); }}>
              <span style={{ color: '#c62828' }}><Icon name="wallet" size={18} /></span> Gastos
            </button>

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0' }} />

            <button className="app-menu-item" style={itemStyle} onClick={() => { onExportPDF('simple'); close(); }}>
              <span style={{ color: '#2e7d32' }}><Icon name="file-text" size={18} /></span> PDF Simple
            </button>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onExportPDF('detallado'); close(); }}>
              <span style={{ color: '#2e7d32' }}><Icon name="file-text" size={18} /></span> PDF Detallado
            </button>

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '6px 0' }} />

            <button className="app-menu-item" style={itemStyle} onClick={() => { onOpenTasas(); close(); }}>
              <span style={{ color: '#00897b' }}><Icon name="trend" size={18} /></span> Tasas de Cambio
            </button>
            <button className="app-menu-item" style={itemStyle} onClick={() => { onOpenBackup(); close(); }}>
              <span style={{ color: '#7b1fa2' }}><Icon name="download" size={18} /></span> Respaldo
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PRODUCT CARD (móvil)
// ═══════════════════════════════════════════════════════════
interface ProductCardProps {
  product: Product;
  isWarehouse: boolean;
  isEstante: boolean;
  onAction: (product: Product, action: ActionType) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}
const ProductCard = ({ product, isWarehouse, isEstante, onAction, onEdit, onDelete }: ProductCardProps) => {
  const showEntrada = !isEstante;
  const showSell = !isWarehouse;
  const outOfStock = product.stock <= 0;

  const actionBtn = (label: string, color: string, bg: string, onClick: () => void) => (
    <button onClick={onClick} className="app-btn" style={{
      flex: 1, padding: '10px 8px', borderRadius: '10px',
      border: `1px solid ${color}20`, backgroundColor: bg,
      color, fontWeight: 700, fontSize: '0.78rem',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '4px', whiteSpace: 'nowrap',
      minWidth: 0,
    }}>
      {label}
    </button>
  );

  return (
    <div className="app-card app-anim" style={{
      backgroundColor: 'white', borderRadius: '16px',
      border: '1px solid rgba(15,23,42,.06)',
      boxShadow: '0 1px 2px rgba(15,23,42,.04)',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          backgroundColor: '#ecfdf5', color: '#059669',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon name="box" size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: '0.92rem', color: '#0f172a',
            lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>{product.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
            {product.moduleId}
          </div>
        </div>
        <div style={{
          fontWeight: 900, fontSize: '1rem', color: '#059669',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>
          {money(product.sale)}
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderRadius: '10px',
        backgroundColor: outOfStock ? '#fef2f2' : '#f8fafc',
        border: outOfStock ? '1px solid #fecaca' : '1px solid #f1f5f9',
      }}>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Stock</span>
        <span style={{
          fontWeight: 900, fontSize: '1rem',
          color: outOfStock ? '#dc2626' : '#0f172a',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {product.stock.toLocaleString('es-CU', { maximumFractionDigits: 2 })}{' '}
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{product.unit}</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {showEntrada && actionBtn('+ Entrada', '#059669', '#ecfdf5', () => onAction(product, 'entrada'))}
        {showSell && actionBtn('+ Vender', '#2563eb', '#eff6ff', () => onAction(product, 'venta'))}
        {showSell && actionBtn('+ Merma', '#dc2626', '#fef2f2', () => onAction(product, 'merma'))}
      </div>

      <div style={{ display: 'flex', gap: '6px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
        <button onClick={() => onEdit(product)} className="app-btn" style={{
          flex: 1, padding: '8px', borderRadius: '8px',
          border: 'none', backgroundColor: '#f8fafc', color: '#475569',
          cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        }}>
          <Icon name="edit" size={14} /> Editar
        </button>
        {isWarehouse ? (
          <button onClick={() => onAction(product, 'traspaso')} className="app-btn" style={{
            flex: 1, padding: '8px', borderRadius: '8px',
            border: 'none', backgroundColor: '#fff7ed', color: '#ea580c',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }}>
            <Icon name="send" size={14} /> Enviar
          </button>
        ) : (
          <button onClick={() => onDelete(product.id!)} className="app-btn" style={{
            flex: 1, padding: '8px', borderRadius: '8px',
            border: 'none', backgroundColor: '#fef2f2', color: '#dc2626',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          }}>
            <Icon name="trash" size={14} /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PRODUCT TABLE (tablet / desktop)
// ═══════════════════════════════════════════════════════════
interface ProductTableProps {
  products: Product[];
  isWarehouse: boolean;
  isEstante: boolean;
  onAction: (product: Product, action: ActionType) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}
const ProductTable = ({ products, isWarehouse, isEstante, onAction, onEdit, onDelete }: ProductTableProps) => {
  const showEntrada = !isEstante;
  const showSell = !isWarehouse;

  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '16px',
      border: '1px solid rgba(15,23,42,.06)',
      boxShadow: '0 1px 2px rgba(15,23,42,.04), 0 8px 20px -8px rgba(15,23,42,.06)',
      overflow: 'hidden',
    }}>
      <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }} className="app-scroll">
        <table className="prod-table">
          <thead>
            <tr>
              <th>Producto</th>
              {showEntrada && <th>Entrada</th>}
              <th style={{ textAlign: 'right' }}>Precio U.</th>
              {showSell && <th>Vender</th>}
              {showSell && <th>Merma</th>}
              <th style={{ textAlign: 'right' }}>Retorno (Stock)</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const outOfStock = product.stock <= 0;
              return (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        backgroundColor: '#ecfdf5', color: '#059669',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon name="box" size={15} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {product.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                          {product.moduleId}
                        </div>
                      </div>
                    </div>
                  </td>

                  {showEntrada && (
                    <td>
                      <button className="cell-btn green" onClick={() => onAction(product, 'entrada')}>
                        + {product.unit}
                      </button>
                    </td>
                  )}

                  <td style={{ textAlign: 'right' }}>
                    <strong style={{
                      color: '#059669', fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{money(product.sale)}</strong>
                  </td>

                  {showSell && (
                    <td>
                      <button className="cell-btn blue" onClick={() => onAction(product, 'venta')}>
                        + Vender
                      </button>
                    </td>
                  )}
                  {showSell && (
                    <td>
                      <button className="cell-btn red" onClick={() => onAction(product, 'merma')}>
                        + Merma
                      </button>
                    </td>
                  )}

                  <td style={{ textAlign: 'right' }}>
                    <strong style={{
                      color: outOfStock ? '#dc2626' : '#0f172a',
                      fontWeight: 900, fontSize: '0.92rem',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {product.stock.toLocaleString('es-CU', { maximumFractionDigits: 2 })}
                    </strong>{' '}
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{product.unit}</span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => onEdit(product)}
                        title="Editar"
                        style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          border: '1px solid #e2e8f0', backgroundColor: 'white',
                          color: '#475569', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all .15s ease',
                        }}
                        className="app-btn"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      {isWarehouse ? (
                        <button
                          onClick={() => onAction(product, 'traspaso')}
                          title="Enviar"
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            border: '1px solid #fed7aa', backgroundColor: '#fff7ed',
                            color: '#ea580c', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s ease',
                          }}
                          className="app-btn"
                        >
                          <Icon name="send" size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onDelete(product.id!)}
                          title="Eliminar"
                          style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            border: '1px solid #fecaca', backgroundColor: '#fef2f2',
                            color: '#dc2626', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .15s ease',
                          }}
                          className="app-btn"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ADD PRODUCT MODAL
// ═══════════════════════════════════════════════════════════
interface AddProductModalProps {
  isMobile: boolean;
  editing?: Product;
  activeLabel: string;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}
const AddProductModal = ({ isMobile, editing, activeLabel, onClose, onSave }: AddProductModalProps) => {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    stock: editing?.stock.toString() ?? '',
    unit: editing?.unit ?? 'unidades',
    cost: editing?.cost.toString() ?? '',
    sale: editing?.sale.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: editing?.id,
        name: form.name.trim(),
        stock: Number(form.stock),
        unit: form.unit,
        cost: Number(form.cost),
        sale: Number(form.sale),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isMobile={isMobile} onClose={onClose}>
      <ModalHeader
        title={editing ? 'Editar producto' : 'Agregar producto'}
        subtitle={`${editing ? 'Editar' : 'Nuevo registro'} en ${activeLabel}`}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={labelStyle}>
          Nombre
          <input className="app-input" required value={form.name} autoFocus
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Mazo de Cebolla" style={fieldStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={labelStyle}>
            Stock actual
            <input className="app-input" required type="number" inputMode="decimal"
              min="0" step="0.01" value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="0" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Unidad
            <select className="app-input" value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              style={fieldStyle}>
              {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={labelStyle}>
            Precio costo
            <input className="app-input" required type="number" inputMode="decimal"
              min="0" step="0.01" value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              placeholder="0.00" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Precio venta
            <input className="app-input" required type="number" inputMode="decimal"
              min="0" step="0.01" value={form.sale}
              onChange={(e) => setForm({ ...form, sale: e.target.value })}
              placeholder="0.00" style={fieldStyle} />
          </label>
        </div>

        <button type="submit" disabled={saving} className="app-btn" style={{
          padding: '14px', borderRadius: '12px', border: 'none',
          background: saving ? '#cbd5e1' : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
          color: 'white', fontWeight: 800, fontSize: '0.95rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saving ? 'none' : '0 6px 16px -4px rgba(5,150,105,.5)',
          marginTop: '6px',
        }}>
          {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar producto'}
        </button>
      </form>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════
// ACTION MODAL
// ═══════════════════════════════════════════════════════════
interface ActionModalProps {
  isMobile: boolean;
  product: Product;
  actionType: ActionType;
  onSubmit: (payload: ActionPayload) => Promise<void>;
  onClose: () => void;
}
const ActionModal = ({ isMobile, product, actionType, onSubmit, onClose }: ActionModalProps) => {
  const [qty, setQty] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS_MERMA[0]);
  const [target, setTarget] = useState<string>('carretilla');
  const [submitting, setSubmitting] = useState(false);

  const titles: Record<ActionType, { title: string; subtitle: string }> = {
    venta: { title: 'Registrar venta', subtitle: 'Se descontará del stock' },
    merma: { title: 'Registrar merma', subtitle: 'Se registrará la pérdida' },
    entrada: { title: 'Registrar entrada', subtitle: 'Se sumará al stock' },
    traspaso: { title: 'Salida de almacén', subtitle: 'Se enviará a otro módulo' },
  };
  const info = titles[actionType];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        quantity,
        wasteMotivo: actionType === 'merma' ? motivo : undefined,
        targetModule: actionType === 'traspaso' ? target : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalVenta = (parseFloat(qty) || 0) * product.sale;

  return (
    <Modal isMobile={isMobile} onClose={onClose} maxWidth={440}>
      <ModalHeader
        title={info.title}
        subtitle={`${product.name} · Stock: ${product.stock} ${product.unit}`}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={labelStyle}>
          Cantidad ({product.unit})
          <input className="app-input" required autoFocus type="number" inputMode="decimal"
            min="0.01" step="0.01" value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            style={{ ...fieldStyle, fontSize: '1.3rem', fontWeight: 800, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} />
        </label>

        {actionType === 'merma' && (
          <label style={labelStyle}>
            Motivo
            <select className="app-input" value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={fieldStyle}>
              {MOTIVOS_MERMA.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        )}

        {actionType === 'traspaso' && (
          <label style={labelStyle}>
            Módulo destino
            <select className="app-input" value={target}
              onChange={(e) => setTarget(e.target.value)}
              style={fieldStyle}>
              {modules.filter((m) => m.id !== 'almacen').map((m) =>
                <option key={m.id} value={m.id}>{m.label}</option>
              )}
            </select>
          </label>
        )}

        {actionType === 'venta' && totalVenta > 0 && (
          <div style={{
            padding: '14px', backgroundColor: '#ecfdf5',
            borderRadius: '12px', textAlign: 'center',
            border: '1px solid #a7f3d0',
          }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, color: '#047857',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>Total</div>
            <div style={{
              fontSize: '1.7rem', fontWeight: 900, color: '#059669',
              marginTop: '4px', letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>{money(totalVenta)}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} className="app-btn" style={{
            flex: 1, padding: '14px', borderRadius: '12px',
            border: '1.5px solid #e2e8f0', backgroundColor: 'white',
            color: '#64748b', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="app-btn" style={{
            flex: 1.3, padding: '14px', borderRadius: '12px', border: 'none',
            background: submitting ? '#cbd5e1' : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            color: 'white', fontWeight: 800, fontSize: '0.9rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 6px 16px -4px rgba(5,150,105,.5)',
          }}>
            {submitting ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════
// BACKUP MODAL
// ═══════════════════════════════════════════════════════════
interface BackupModalProps {
  isMobile: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}
const BackupModal = ({ isMobile, onClose, onExport, onImport }: BackupModalProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Modal isMobile={isMobile} onClose={onClose}>
      <ModalHeader title="Respaldo y restauración" onClose={onClose} />
      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
        Descarga un archivo con toda tu información para guardarlo en un pendrive. Si algo pasa, puedes restaurarlo aquí.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        <button onClick={onExport} className="app-btn" style={{
          padding: '14px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
          color: 'white', fontWeight: 800, fontSize: '0.9rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
          boxShadow: '0 6px 16px -4px rgba(5,150,105,.5)',
        }}>
          <Icon name="download" size={18} /> Exportar datos
        </button>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '10px', fontWeight: 600 }}>
            Restaurar desde archivo:
          </div>
          <input type="file" accept=".json" ref={fileRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
            style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} className="app-btn" style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: '#1d4ed8', color: 'white', fontWeight: 800,
            fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 6px 16px -4px rgba(29,78,216,.5)',
          }}>
            <Icon name="upload" size={18} /> Importar datos
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════
// TASAS MODAL
// ═══════════════════════════════════════════════════════════
interface TasasModalProps {
  isMobile: boolean;
  tasas: { rateUSD: number; rateEUR: number; rateMLC: number };
  onClose: () => void;
  onSave: (t: { rateUSD: number; rateEUR: number; rateMLC: number }) => Promise<void>;
}
const TasasModal = ({ isMobile, tasas, onClose, onSave }: TasasModalProps) => {
  const [rates, setRates] = useState({
    rateUSD: tasas.rateUSD || '',
    rateEUR: tasas.rateEUR || '',
    rateMLC: tasas.rateMLC || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        rateUSD: parseFloat(rates.rateUSD as string) || 0,
        rateEUR: parseFloat(rates.rateEUR as string) || 0,
        rateMLC: parseFloat(rates.rateMLC as string) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputs: { key: keyof typeof rates; flag: string; label: string; placeholder: string }[] = [
    { key: 'rateUSD', flag: '💵', label: '1 USD = ? CUP', placeholder: 'Ej: 500' },
    { key: 'rateEUR', flag: '💶', label: '1 EUR = ? CUP', placeholder: 'Ej: 550' },
    { key: 'rateMLC', flag: '🏦', label: '1 MLC = ? CUP', placeholder: 'Ej: 400' },
  ];

  return (
    <Modal isMobile={isMobile} onClose={onClose}>
      <ModalHeader
        title="Tasas de cambio"
        subtitle="Se usarán para convertir las ventas en la Caja"
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {inputs.map((inp) => (
          <label key={inp.key} style={labelStyle}>
            {inp.flag} {inp.label}
            <input className="app-input" type="number" inputMode="decimal" min="0" step="0.01"
              value={rates[inp.key]}
              onChange={(e) => setRates({ ...rates, [inp.key]: e.target.value })}
              placeholder={inp.placeholder}
              style={{ ...fieldStyle, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }} />
          </label>
        ))}
        <button type="submit" disabled={saving} className="app-btn" style={{
          padding: '14px', borderRadius: '12px', border: 'none',
          background: saving ? '#cbd5e1' : 'linear-gradient(135deg, #047857 0%, #059669 100%)',
          color: 'white', fontWeight: 800, fontSize: '0.95rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          boxShadow: saving ? 'none' : '0 6px 16px -4px rgba(5,150,105,.5)',
          marginTop: '6px',
        }}>
          {saving ? 'Guardando...' : 'Guardar tasas'}
        </button>
      </form>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [activeModule, setActiveModule] = useState<ModuleId>('carretilla');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [tasas, setTasas] = useState({ rateUSD: 0, rateEUR: 0, rateMLC: 0 });

  const showToast = (msg: string, type: ToastData['type'] = 'success') => {
    setToast({ msg, type });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    db.settings.get(1).then((s) => {
      if (s) setTasas({ rateUSD: s.rateUSD, rateEUR: s.rateEUR, rateMLC: s.rateMLC });
    });
  }, []);

  const products = useLiveQuery(
    () => db.products.where({ moduleId: activeModule }).toArray(),
    [activeModule]
  ) ?? [];

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase().trim();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchTerm]);

  const salesToday = useLiveQuery(async () => {
    const today = getTodayLocalString();
    const all = await db.sales.toArray();
    return all.filter((s) => s.date.startsWith(today));
  }, []) ?? [];

  const todayStats = useMemo(() => ({
    totalSales: salesToday.reduce((sum, s) => sum + s.total, 0),
    totalProfit: salesToday.reduce((sum, s) => sum + s.profit, 0),
  }), [salesToday]);

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );

  const activeLabel = modules.find((m) => m.id === activeModule)?.label ?? 'Carretilla';
  const isWarehouse = activeModule === 'almacen';
  const isEstante = activeModule === 'estante';

  const formattedDate = useMemo(
    () => new Intl.DateTimeFormat('es-CU', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date()),
    []
  );

  // ── Handlers ─────────────────────────────────────────────
  const handleSaveProduct = async (data: ProductFormData) => {
    if (data.id) {
      await db.products.update(data.id, {
        name: data.name, stock: data.stock, unit: data.unit,
        cost: data.cost, sale: data.sale,
      });
      showToast('Producto actualizado');
    } else {
      await db.products.add({
        ...data, moduleId: activeModule, accent: 'teal',
      });
      showToast('Producto agregado');
    }
    setModal(null);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Eliminar producto? Esta acción no borra el historial de ventas.')) return;
    await db.products.delete(id);
    showToast('Producto eliminado');
  };

  const handleAction = async ({ quantity, wasteMotivo, targetModule }: ActionPayload) => {
    if (modal?.kind !== 'action') return;
    const { product, actionType } = modal;

    if (actionType === 'venta') {
      if (quantity > product.stock) {
        showToast('No hay suficiente stock', 'error'); return;
      }
      await db.sales.add({
        productId: product.id!, productName: product.name, quantity,
        total: product.sale * quantity,
        profit: (product.sale - product.cost) * quantity,
        date: new Date().toISOString(),
        moduleId: activeModule, unit: product.unit,
        paymentMethod: 'efectivo',
        cashAmount: product.sale * quantity, transferAmount: 0,
      });
      await db.products.update(product.id!, { stock: product.stock - quantity });
      showToast('Venta registrada');
    } else if (actionType === 'merma') {
      if (quantity > product.stock) {
        showToast('No hay suficiente stock', 'error'); return;
      }
      await db.wastes.add({
        productId: product.id!, productName: product.name, quantity,
        costLost: product.cost * quantity,
        date: new Date().toISOString(),
        moduleId: activeModule, unit: product.unit,
        motivo: wasteMotivo,
      });
      await db.products.update(product.id!, { stock: product.stock - quantity });
      showToast(`Merma registrada (${wasteMotivo})`);
    } else if (actionType === 'entrada') {
      await db.products.update(product.id!, { stock: product.stock + quantity });
      showToast('Entrada registrada');
    } else if (actionType === 'traspaso') {
      if (!targetModule) return;
      if (quantity > product.stock) {
        showToast('No hay suficiente stock', 'error'); return;
      }
      await db.transfers.add({
        productId: product.id!, productName: product.name, quantity,
        fromModule: 'almacen', toModule: targetModule,
        date: new Date().toISOString(), unit: product.unit,
      });
      await db.products.update(product.id!, { stock: product.stock - quantity });

      const existing = await db.products.where({
        moduleId: targetModule, name: product.name,
      }).first();
      if (existing) {
        await db.products.update(existing.id!, { stock: existing.stock + quantity });
      } else {
        await db.products.add({
          name: product.name, stock: quantity, unit: product.unit,
          cost: product.cost, sale: product.sale,
          accent: product.accent, moduleId: targetModule,
        });
      }
      const targetLabel = modules.find((m) => m.id === targetModule)?.label ?? targetModule;
      showToast(`Enviados ${quantity} a ${targetLabel}`);
    }
    setModal(null);
  };

  const handleSaveTasas = async (newRates: typeof tasas) => {
    await db.settings.put({ id: 1, ...newRates, updatedAt: new Date().toISOString() });
    setTasas(newRates);
    showToast('Tasas actualizadas');
    setModal(null);
  };

  // ── Backup ───────────────────────────────────────────────
  const handleExportBackup = async () => {
    try {
      const backup = {
        version: 4,
        date: new Date().toISOString(),
        products: await db.products.toArray(),
        sales: await db.sales.toArray(),
        wastes: await db.wastes.toArray(),
        transfers: await db.transfers.toArray(),
        expenses: await db.expenses.toArray(),
        settings: await db.settings.toArray(),
      };
      const dataStr = JSON.stringify(backup);
      const fileName = `elrocio_backup_${getTodayLocalString()}.json`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName, data: dataStr,
          directory: Directory.Cache, encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Respaldo El Rocío',
          text: 'Aquí tienes tu respaldo.',
          url: result.uri,
          dialogTitle: 'Guardar o compartir respaldo',
        });
        showToast('Respaldo compartido');
      } else {
        const dataUri = 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Respaldo descargado');
      }
      setModal(null);
    } catch (err) {
      console.error('[Backup] Error al exportar:', err);
      showToast('Error al crear el respaldo', 'error');
    }
  };

  const handleImportBackup = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.products || !data.sales || !data.wastes) {
          showToast('Archivo inválido', 'error'); return;
        }
        if (!window.confirm('⚠️ ADVERTENCIA: Esto borrará TODOS los datos actuales. ¿Continuar?')) return;

        await Promise.all([
          db.products.clear(), db.sales.clear(), db.wastes.clear(),
          db.transfers.clear(), db.expenses.clear(),
        ]);
        await db.products.bulkAdd(data.products);
        await db.sales.bulkAdd(data.sales);
        await db.wastes.bulkAdd(data.wastes);
        if (data.transfers?.length) await db.transfers.bulkAdd(data.transfers);
        if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);

        showToast('Datos restaurados');
        setModal(null);
      } catch (err) {
        console.error('[Backup] Error al importar:', err);
        showToast('Error al leer el archivo', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ── PDF ──────────────────────────────────────────────────
  const exportCatalogPDF = async (tipo: CatalogType) => {
    const allProducts = await db.products.toArray();
    if (allProducts.length === 0) {
      showToast('No hay productos para exportar', 'error'); return;
    }

    const doc = new jsPDF();
    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, 210, 40, 'F');

    try { doc.addImage(LOGO_BASE64, 'PNG', 10, 5, 30, 30); } catch (e) { console.error(e); }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('El Rocío', 50, 25);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(tipo === 'simple' ? 'Catálogo de Precios' : 'Catálogo Detallado', 50, 33);
    doc.text(`Actualizado: ${new Date().toLocaleDateString()}`, 150, 33);

    let startY = 50;
    const modulosAMostrar = tipo === 'simple'
      ? ['carretilla', 'carnicos', 'estante']
      : modules.map((m) => m.id);

    for (const modId of modulosAMostrar) {
      const mod = modules.find((m) => m.id === modId);
      if (!mod) continue;
      const modProducts = allProducts.filter((p) => p.moduleId === mod.id);
      if (modProducts.length === 0) continue;

      if (startY > 250) { doc.addPage(); startY = 20; }

      doc.setTextColor(46, 125, 50);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(mod.label.toUpperCase(), 15, startY);

      let head: string[][];
      let tableData: string[][];

      if (tipo === 'simple') {
        head = [['Producto', 'Precio']];
        tableData = modProducts.map((p) => [p.name, money(p.sale)]);
      } else {
        head = [['Producto', 'Stock', 'Unidad', 'P. Compra', 'P. Venta']];
        tableData = modProducts.map((p) => [
          p.name,
          p.stock.toLocaleString('es-CU', { maximumFractionDigits: 2 }),
          p.unit, money(p.cost), money(p.sale),
        ]);
      }

      autoTable(doc, {
        startY: startY + 5,
        head, body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [46, 125, 50], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: tipo === 'simple' ? 12 : 10, cellPadding: 4 },
        columnStyles: tipo === 'simple'
          ? { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' } }
          : { 0: { cellWidth: 70 }, 1: { cellWidth: 30, halign: 'right' }, 2: { cellWidth: 25 }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } },
      });
      // @ts-ignore - autoTable agrega lastAutoTable
      startY = doc.lastAutoTable.finalY + 15;
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(
        `Generado con El Rocío - ${tipo === 'simple' ? 'Catálogo Simple' : 'Catálogo Detallado'}`,
        15, 290
      );
    }

    const fileName = `Catalogo_${tipo}_El_Rocio_${getTodayLocalString()}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBlob = doc.output('blob');
        const base64 = await blobToBase64(pdfBlob);
        const result = await Filesystem.writeFile({
          path: fileName, data: base64, directory: Directory.Cache,
        });
        await Share.share({
          title: 'Catálogo El Rocío',
          text: 'Aquí tienes el catálogo.',
          url: result.uri,
          dialogTitle: 'Guardar o compartir catálogo',
        });
      } catch (err) {
        console.error('[PDF] Error:', err);
        showToast('Error al generar PDF en el móvil', 'error');
        return;
      }
    } else {
      doc.save(fileName);
    }

    showToast(`Catálogo ${tipo} generado`);
  };

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
        boxShadow: '0 4px 24px -6px rgba(5,150,105,.4)',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexShrink: 0, zIndex: 20,
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          backgroundColor: 'rgba(255,255,255,.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, overflow: 'hidden',
        }}>
          <img src="/logo.png" alt="El Rocío"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, color: 'white', minWidth: 0 }}>
          <div style={{
            fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}>El Rocío</div>
          <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
            Control de inventario
          </div>
        </div>

        {!isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', backgroundColor: 'rgba(255,255,255,.15)',
            borderRadius: '12px', color: 'white', fontWeight: 600, fontSize: '0.82rem',
            backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
          }}>
            <Icon name="calendar" size={16} />
            <span style={{ textTransform: 'capitalize' }}>{formattedDate}</span>
          </div>
        )}

        <MenuDropdown
          onNavigate={navigate}
          onExportPDF={exportCatalogPDF}
          onOpenBackup={() => setModal({ kind: 'backup' })}
          onOpenTasas={() => setModal({ kind: 'tasas' })}
        />
      </header>

      {/* MAIN */}
      <div className="app-scroll" style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        paddingBottom: '84px',
      }}>

        {/* Section heading */}
        <section style={{ padding: isMobile ? '14px 14px 0' : '20px 24px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: '0.7rem', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: '#94a3b8',
              }}>Módulo activo</div>
              <h2 style={{
                margin: '4px 0 0', fontSize: '1.3rem', fontWeight: 800,
                color: '#0f172a', letterSpacing: '-0.02em',
              }}>{activeLabel}</h2>
            </div>
            <button
              onClick={() => setModal({ kind: 'add' })}
              className="app-btn"
              style={{
                padding: '12px 18px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
                color: 'white', fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '6px', boxShadow: '0 6px 16px -4px rgba(5,150,105,.5)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon name="plus" size={18} /> Agregar
            </button>
          </div>
        </section>

        {/* Quick stats */}
        <section style={{
          padding: isMobile ? '14px' : '16px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}>
          {[
            { label: 'Productos', value: products.length.toString(), icon: 'box' as IconName, color: '#059669', bg: '#ecfdf5' },
            { label: 'Ganancia hoy', value: money(todayStats.totalProfit), icon: 'trend' as IconName, color: '#ea580c', bg: '#fff7ed' },
            { label: 'Ventas hoy', value: money(todayStats.totalSales), icon: 'money' as IconName, color: '#2563eb', bg: '#eff6ff' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px', backgroundColor: 'white',
              borderRadius: '14px',
              border: '1px solid rgba(15,23,42,.06)',
              boxShadow: '0 1px 2px rgba(15,23,42,.04)',
              minWidth: 0,
            }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                backgroundColor: s.bg, color: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name={s.icon} size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', color: '#64748b',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{s.label}</div>
                <div style={{
                  fontSize: '1rem', fontWeight: 900, color: s.color,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  marginTop: '1px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{s.value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Search + counter */}
        <section style={{ padding: isMobile ? '0 14px' : '0 24px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: '#94a3b8',
                pointerEvents: 'none',
              }}>
                <Icon name="search" size={18} />
              </div>
              <input
                type="text" placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="app-input"
                style={{
                  width: '100%', padding: '12px 14px 12px 42px',
                  borderRadius: '12px', border: '1.5px solid #e2e8f0',
                  fontSize: '0.92rem', outline: 'none', backgroundColor: 'white',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
              />
            </div>
            {!isMobile && (
              <div style={{
                padding: '12px 14px', borderRadius: '12px',
                backgroundColor: 'white', border: '1px solid #e2e8f0',
                fontSize: '0.82rem', fontWeight: 700, color: '#64748b',
                whiteSpace: 'nowrap',
              }}>
                {filteredProducts.length} prod. · {totalStock.toLocaleString('es-CU')} unid.
              </div>
            )}
          </div>
        </section>

        {/* ═════════ PRODUCTOS: TABLE (tablet) / CARDS (móvil) ═════════ */}
        <section style={{ padding: isMobile ? '14px' : '16px 24px 24px' }}>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={searchTerm ? 'search' : 'box'}
              title={searchTerm ? 'Sin resultados' : 'Sin productos en este módulo'}
              subtitle={searchTerm ? 'Intenta con otro término' : 'Toca "Agregar" para crear el primero'}
            />
          ) : isMobile ? (
            // ── MÓVIL: cards ──
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWarehouse={isWarehouse}
                  isEstante={isEstante}
                  onAction={(p, action) => setModal({ kind: 'action', product: p, actionType: action })}
                  onEdit={(p) => setModal({ kind: 'add', editing: p })}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          ) : (
            // ── TABLET/DESKTOP: tabla ──
            <ProductTable
              products={filteredProducts}
              isWarehouse={isWarehouse}
              isEstante={isEstante}
              onAction={(p, action) => setModal({ kind: 'action', product: p, actionType: action })}
              onEdit={(p) => setModal({ kind: 'add', editing: p })}
              onDelete={handleDeleteProduct}
            />
          )}
        </section>
      </div>

      {/* BOTTOM NAV */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: '4px',
        padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgba(255,255,255,.96)',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -8px 24px -8px rgba(15,23,42,.12)',
        backdropFilter: 'blur(12px)',
        zIndex: 30,
      }}>
        {modules.map((m) => {
          const active = activeModule === m.id;
          return (
            <button key={m.id} onClick={() => setActiveModule(m.id)} className="app-nav-item" style={{
              ...inputReset, flex: 1,
              padding: '10px 4px', borderRadius: '12px',
              backgroundColor: active ? '#ecfdf5' : 'transparent',
              color: active ? '#047857' : '#64748b',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '3px', fontSize: '0.7rem', fontWeight: 800,
              minWidth: 0,
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                backgroundColor: active ? '#059669' : '#f1f5f9',
                color: active ? 'white' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={m.icon} size={16} />
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {m.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* MODALES */}
      {modal?.kind === 'add' && (
        <AddProductModal
          isMobile={isMobile}
          editing={modal.editing}
          activeLabel={activeLabel}
          onClose={() => setModal(null)}
          onSave={handleSaveProduct}
        />
      )}

      {modal?.kind === 'action' && (
        <ActionModal
          isMobile={isMobile}
          product={modal.product}
          actionType={modal.actionType}
          onSubmit={handleAction}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'backup' && (
        <BackupModal
          isMobile={isMobile}
          onClose={() => setModal(null)}
          onExport={handleExportBackup}
          onImport={handleImportBackup}
        />
      )}

      {modal?.kind === 'tasas' && (
        <TasasModal
          isMobile={isMobile}
          tasas={tasas}
          onClose={() => setModal(null)}
          onSave={handleSaveTasas}
        />
      )}

      {/* TOAST */}
      {toast && <Toast toast={toast} />}
    </div>
  );
}
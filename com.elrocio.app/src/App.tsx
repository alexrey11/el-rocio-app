import { FormEvent, useMemo, useState, useRef } from 'react';
import { db, Product, Sale, Waste } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';

type IconName = 'cart' | 'shelf' | 'meat' | 'warehouse' | 'plus' | 'calendar' | 'close' | 'trend' | 'box' | 'money' | 'check' | 'trash' | 'send' | 'minus' | 'edit' | 'download' | 'upload' | 'search' | 'file-text' | 'list';

const modules = [
  { id: 'carretilla', label: 'Carretilla', icon: 'cart' as IconName },
  { id: 'estante', label: 'Estante', icon: 'shelf' as IconName },
  { id: 'carnicos', label: 'Cárnicos', icon: 'meat' as IconName },
  { id: 'almacen', label: 'Almacén', icon: 'warehouse' as IconName },
];

const unidades = ['unidades', 'libras', 'kilogramos', 'gramos', 'mazos', 'pomos', 'litros', 'mililitros'];
const money = (value: number) => `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;

const getTodayLocalString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// AQUÍ ESTÁ TU LOGO EN BASE64
const LOGO_BASE64 = "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";

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  const paths: Record<IconName, JSX.Element> = {
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
    list: <><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('carretilla');
  const [isAddOpen, setAddOpen] = useState(false);
  const [isActionOpen, setActionOpen] = useState(false);
  const [isBackupOpen, setBackupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [newProduct, setNewProduct] = useState({ name: '', stock: '', unit: 'unidades', cost: '', sale: '' });
  const [actionQty, setActionQty] = useState('');
  const [actionType, setActionType] = useState<'venta' | 'merma' | 'entrada' | 'traspaso'>('venta');

  const [summaryPeriod] = useState<'dia'>('dia');
  const [selectedDate] = useState<string>(getTodayLocalString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useLiveQuery(() => db.products.where({ moduleId: activeModule }).toArray(), [activeModule]) || [];

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const salesData = useLiveQuery(async () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    const sales = await db.sales.where('date').between(startDate.toISOString(), endDate.toISOString(), true, true).toArray();
    return { sales };
  }, [selectedDate]);

  const activeLabel = modules.find((item) => item.id === activeModule)?.label ?? 'Carretilla';
  const formattedDate = useMemo(() => new Intl.DateTimeFormat('es-CU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalSales = salesData?.sales.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalProfit = salesData?.sales.reduce((sum, s) => sum + s.profit, 0) || 0;

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseFloat(actionQty);
    if (isNaN(qty) || qty <= 0) return;

    if (actionType === 'venta') {
      if (qty > selectedProduct.stock) { setNotice('No hay suficiente stock.'); return; }
      await db.sales.add({
        productId: selectedProduct.id!, productName: selectedProduct.name, quantity: qty,
        total: selectedProduct.sale * qty, profit: (selectedProduct.sale - selectedProduct.cost) * qty,
        date: new Date().toISOString(), moduleId: activeModule, unit: selectedProduct.unit
      });
      await db.products.update(selectedProduct.id!, { stock: selectedProduct.stock - qty });
      setNotice(`Venta registrada.`);
    }
    else if (actionType === 'merma') {
      if (qty > selectedProduct.stock) { setNotice('No hay suficiente stock.'); return; }
      await db.wastes.add({
        productId: selectedProduct.id!, productName: selectedProduct.name, quantity: qty,
        costLost: selectedProduct.cost * qty, date: new Date().toISOString(),
        moduleId: activeModule, unit: selectedProduct.unit
      });
      await db.products.update(selectedProduct.id!, { stock: selectedProduct.stock - qty });
      setNotice(`Merma registrada.`);
    }
    else if (actionType === 'entrada') {
      await db.products.update(selectedProduct.id!, { stock: selectedProduct.stock + qty });
      setNotice(`Entrada registrada.`);
    }
    else if (actionType === 'traspaso') {
      const target = (document.getElementById('target-module') as HTMLSelectElement).value;
      if (qty > selectedProduct.stock) { setNotice('No hay suficiente stock.'); return; }

      await db.transfers.add({
        productId: selectedProduct.id!,
        productName: selectedProduct.name,
        quantity: qty,
        fromModule: 'almacen',
        toModule: target,
        date: new Date().toISOString(),
        unit: selectedProduct.unit
      });

      await db.products.update(selectedProduct.id!, { stock: selectedProduct.stock - qty });
      const existing = await db.products.where({ moduleId: target, name: selectedProduct.name }).first();
      if (existing) {
        await db.products.update(existing.id!, { stock: existing.stock + qty });
      } else {
        await db.products.add({ ...selectedProduct, id: undefined, stock: qty, moduleId: target });
      }
      setNotice(`Enviados ${qty} a ${target}.`);
    }

    setActionOpen(false);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const saveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingProduct) {
      await db.products.update(editingProduct.id!, {
        name: newProduct.name.trim(), stock: Number(newProduct.stock), unit: newProduct.unit,
        cost: Number(newProduct.cost), sale: Number(newProduct.sale),
      });
      setNotice('Producto actualizado.');
    } else {
      await db.products.add({
        name: newProduct.name.trim(), stock: Number(newProduct.stock), unit: newProduct.unit,
        cost: Number(newProduct.cost), sale: Number(newProduct.sale), accent: 'teal', moduleId: activeModule,
      });
      setNotice('Producto agregado.');
    }
    setNewProduct({ name: '', stock: '', unit: 'unidades', cost: '', sale: '' });
    setEditingProduct(null);
    setAddOpen(false);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name, stock: product.stock.toString(), unit: product.unit,
      cost: product.cost.toString(), sale: product.sale.toString()
    });
    setAddOpen(true);
  };

  const deleteProduct = async (id: number) => {
    if (window.confirm('¿Eliminar producto? Esta acción no borra el historial de ventas.')) {
      await db.products.delete(id);
      setNotice('Producto eliminado.'); window.setTimeout(() => setNotice(''), 2000);
    }
  };

  const exportBackup = async () => {
    const allProducts = await db.products.toArray();
    const allSales = await db.sales.toArray();
    const allWastes = await db.wastes.toArray();
    const backupData = { version: 2, date: new Date().toISOString(), products: allProducts, sales: allSales, wastes: allWastes, transfers: await db.transfers.toArray() };
    const dataStr = JSON.stringify(backupData);
    const fileName = `elrocio_backup_${getTodayLocalString()}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });
        await Share.share({
          title: 'Respaldo El Rocío',
          text: 'Aquí tienes tu respaldo de El Rocío.',
          url: result.uri,
          dialogTitle: 'Guardar o compartir respaldo'
        });
        setNotice('Respaldo compartido.');
      } catch (err) {
        console.error(err);
        setNotice('Error al guardar el respaldo.');
      }
    } else {
      const dataUri = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataUri);
      downloadAnchorNode.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      setNotice('Respaldo descargado.');
    }
    setBackupOpen(false);
    window.setTimeout(() => setNotice(''), 3000);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products && data.sales && data.wastes) {
          if (window.confirm('⚠️ ADVERTENCIA: Esto borrará TODOS los datos actuales y pondrá los del archivo. ¿Continuar?')) {
            await db.products.clear();
            await db.sales.clear();
            await db.wastes.clear();
            await db.transfers.clear();
            await db.products.bulkAdd(data.products);
            await db.sales.bulkAdd(data.sales);
            await db.wastes.bulkAdd(data.wastes);
            if (data.transfers) await db.transfers.bulkAdd(data.transfers);
            setNotice('Datos restaurados con éxito.');
            setBackupOpen(false);
            window.setTimeout(() => setNotice(''), 3000);
          }
        } else {
          setNotice('Archivo inválido.');
        }
      } catch (err) {
        setNotice('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
  };

  const exportCatalogPDF = async () => {
    const allProducts = await db.products.toArray();
    if (allProducts.length === 0) {
      setNotice('No hay productos para exportar.');
      return;
    }

    const doc = new jsPDF();

    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, 210, 40, 'F');

    try {
      doc.addImage(LOGO_BASE64, 'PNG', 10, 5, 30, 30);
    } catch (e) { console.error("Error al cargar logo en PDF", e); }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('El Rocío', 50, 25);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Catálogo de Productos', 50, 33);
    doc.text(`Actualizado: ${new Date().toLocaleDateString()}`, 150, 33);

    let startY = 50;

    for (const mod of modules) {
      const modProducts = allProducts.filter(p => p.moduleId === mod.id);

      if (modProducts.length > 0) {
        doc.setTextColor(46, 125, 50);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(mod.label.toUpperCase(), 15, startY);

        const tableData = modProducts.map(p => [
          p.name,
          `${p.stock.toLocaleString('es-CU')} ${p.unit}`,
          money(p.sale)
        ]);

        autoTable(doc, {
          startY: startY + 5,
          head: [['Producto', 'Disponibilidad', 'Precio']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [46, 125, 50], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          styles: { fontSize: 11, cellPadding: 4 },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 50 },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
          }
        });

        // @ts-ignore
        startY = doc.lastAutoTable.finalY + 15;

        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Generado con El Rocío - Control de Inventario', 15, 290);
    }

    if (Capacitor.isNativePlatform()) {
      const pdfBlob = doc.output('blob');
      const base64 = await blobToBase64(pdfBlob);
      try {
        const result = await Filesystem.writeFile({
          path: `Catalogo_El_Rocio_${getTodayLocalString()}.pdf`,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Catálogo El Rocío',
          text: 'Aquí tienes el catálogo de El Rocío.',
          url: result.uri,
          dialogTitle: 'Guardar o compartir catálogo'
        });
      } catch (err) {
        setNotice('Error al generar PDF en el móvil.');
      }
    } else {
      doc.save(`Catalogo_El_Rocio_${getTodayLocalString()}.pdf`);
    }

    setNotice('Catálogo PDF generado.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const openActionModal = (product: Product, type: 'venta' | 'merma' | 'entrada' | 'traspaso') => {
    setSelectedProduct(product);
    setActionType(type);
    setActionQty('');
    setActionOpen(true);
  };

  const isWarehouse = activeModule === 'almacen';
  const isEstante = activeModule === 'estante';
  const showEntrada = !isEstante;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src="/logo.png" alt="Logo El Rocío" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} />
          </div>
          <div><h1>El Rocío</h1><p>Control de inventario</p></div>
        </div>
        <div className="header-actions">
          <div className="date-block" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '0.95rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
            <Icon name="calendar" size={19} />
            <span>{formattedDate}</span>
          </div>

          <button
            className="icon-btn-blue"
            style={{ backgroundColor: '#f57c00', color: 'white' }}
            onClick={() => navigate('/carrito')}
            title="Ventas Rápidas"
          >
            <Icon name="cart" size={20} />
          </button>

          <button
            className="icon-btn-blue"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            onClick={() => navigate('/historial')}
            title="Ver Constancias"
          >
            <Icon name="list" size={20} />
          </button>

          <button className="icon-btn-blue" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} onClick={exportCatalogPDF} title="Exportar Catálogo PDF">
            <Icon name="file-text" size={20} />
          </button>

          <button className="icon-btn-blue" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} onClick={() => setBackupOpen(true)} title="Respaldo">
            <Icon name="download" size={20} />
          </button>

          <button className="summary-button" onClick={() => navigate('/caja')}>
            <Icon name="money" size={20} />
            <span>Caja</span>
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="content-panel">
          <div className="section-heading">
            <div><div className="eyebrow">Módulo activo</div><h2>{activeLabel}</h2></div>
            <button className="add-button" onClick={() => { setEditingProduct(null); setNewProduct({ name: '', stock: '', unit: 'unidades', cost: '', sale: '' }); setAddOpen(true); }}><Icon name="plus" size={22} /><span>Agregar Producto</span></button>
          </div>

          <div className="quick-stats">
            <div className="quick-stat"><div className="stat-icon green-icon"><Icon name="box" size={20} /></div><div><span>Productos</span><strong>{products.length}</strong></div></div>
            <div className="quick-stat"><div className="stat-icon amber-icon"><Icon name="trend" size={20} /></div><div><span>Ganancia (hoy)</span><strong>{money(totalProfit)}</strong></div></div>
            <div className="quick-stat"><div className="stat-icon blue-icon"><Icon name="money" size={20} /></div><div><span>Ventas (hoy)</span><strong>{money(totalSales)}</strong></div></div>
          </div>

          <div className="search-bar">
            <Icon name="search" size={20} />
            <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  {showEntrada && <th>Entrada</th>}
                  <th>Precio U.</th>
                  {!isWarehouse && (
                    <>
                      <th>Cant. Venta</th>
                      <th>Merma</th>
                    </>
                  )}
                  <th>Retorno (Stock)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={isWarehouse ? 4 : (isEstante ? 5 : 6)} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No hay productos. Toca "+ Agregar Producto".</td></tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td data-label="Producto">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={`product-badge-sm ${product.accent}`}><Icon name="box" size={16} /></div>
                          <strong>{product.name}</strong>
                        </div>
                      </td>

                      {showEntrada && (
                        <td data-label="Entrada">
                          <button className="cell-btn" onClick={() => openActionModal(product, 'entrada')}>
                            + {product.unit}
                          </button>
                        </td>
                      )}

                      <td data-label="Precio U.">{money(product.sale)}</td>

                      {!isWarehouse && (
                        <>
                          <td data-label="Vender">
                            <button className="cell-btn sell" onClick={() => openActionModal(product, 'venta')}>
                              + Vender
                            </button>
                          </td>
                          <td data-label="Merma">
                            <button className="cell-btn merma" onClick={() => openActionModal(product, 'merma')}>
                              + Merma
                            </button>
                          </td>
                        </>
                      )}

                      <td data-label="Stock"><strong style={{ color: product.stock === 0 ? 'red' : '#2e7d32' }}>{product.stock.toLocaleString('es-CU', { maximumFractionDigits: 2 })}</strong> <small>{product.unit}</small></td>
                      <td data-label="Acciones">
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="icon-btn-blue" onClick={() => openEditModal(product)} title="Editar"><Icon name="edit" size={18} /></button>
                          {isWarehouse ? (
                            <button className="icon-btn-blue" onClick={() => openActionModal(product, 'traspaso')} title="Enviar"><Icon name="send" size={18} /></button>
                          ) : (
                            <button className="icon-btn-red" onClick={() => deleteProduct(product.id!)} title="Eliminar"><Icon name="trash" size={18} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <nav className="bottom-nav">
        {modules.map((item) => <button key={item.id} className={activeModule === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActiveModule(item.id)}><span className="nav-icon"><Icon name={item.icon} size={24} /></span><span>{item.label}</span>{activeModule === item.id && <i />}</button>)}
      </nav>

      {notice && <div className="toast"><span className="toast-check"><Icon name="check" size={16} /></span>{notice}</div>}

      {/* MODAL DE RESPALDO */}
      {isBackupOpen && <div className="modal-backdrop" onClick={() => setBackupOpen(false)}>
        <section className="modal-card form-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setBackupOpen(false)}><Icon name="close" size={22} /></button>
          <div className="modal-kicker">Seguridad de Datos</div>
          <h2>Respaldo y Restauración</h2>
          <p className="modal-description">Descarga un archivo con toda tu información para guardarlo en un pendrive. Si algo pasa, puedes restaurarlo aquí.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <button className="modal-primary" onClick={exportBackup}><Icon name="download" size={18} /> Exportar Datos</button>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Restaurar desde un archivo:</p>
              <input type="file" accept=".json" ref={fileInputRef} onChange={importBackup} style={{ display: 'none' }} />
              <button className="modal-primary" style={{ backgroundColor: '#1565c0' }} onClick={() => fileInputRef.current?.click()}><Icon name="upload" size={18} /> Importar Datos</button>
            </div>
          </div>
        </section>
      </div>}

      {/* MODAL DE ACCIÓN */}
      {isActionOpen && selectedProduct && <div className="modal-backdrop" onClick={() => setActionOpen(false)}>
        <section className="modal-card form-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setActionOpen(false)}><Icon name="close" size={22} /></button>
          <div className="modal-kicker">
            {actionType === 'venta' && 'Registrar Venta'}
            {actionType === 'merma' && 'Registrar Merma'}
            {actionType === 'entrada' && 'Registrar Entrada'}
            {actionType === 'traspaso' && 'Dar Salida (Almacén)'}
          </div>
          <h2>{selectedProduct.name}</h2>
          <p className="modal-description">Stock actual: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong></p>

          <form onSubmit={handleAction}>
            <label>Cantidad ({selectedProduct.unit})
              <input required autoFocus min="0.01" step="0.01" type="number" value={actionQty} onChange={(e) => setActionQty(e.target.value)} placeholder="0" />
            </label>

            {actionType === 'venta' && <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', color: '#2e7d32', marginBottom: '15px' }}>Total: {money((parseFloat(actionQty) || 0) * selectedProduct.sale)}</div>}

            {actionType === 'traspaso' && (
              <label>Módulo Destino
                <select id="target-module">
                  {modules.filter(m => m.id !== 'almacen').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
            )}

            <button className="modal-primary" type="submit">Confirmar</button>
          </form>
        </section>
      </div>}

      {/* MODAL DE AGREGAR/EDITAR PRODUCTO */}
      {isAddOpen && <div className="modal-backdrop" onClick={() => { setAddOpen(false); setEditingProduct(null); }}><section className="modal-card form-card" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => { setAddOpen(false); setEditingProduct(null); }}><Icon name="close" size={22} /></button><div className="modal-kicker">{editingProduct ? 'Editar' : 'Nuevo registro'} en {activeLabel}</div><h2>{editingProduct ? 'Editar producto' : 'Agregar producto'}</h2><form onSubmit={saveProduct}><label>Nombre<input required value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} placeholder="Ej. Mazo de Cebolla" /></label><div className="form-row"><label>Stock actual<input required min="0" step="0.01" type="number" value={newProduct.stock} onChange={(event) => setNewProduct({ ...newProduct, stock: event.target.value })} placeholder="0" /></label><label>Unidad<select value={newProduct.unit} onChange={(event) => setNewProduct({ ...newProduct, unit: event.target.value })}>{unidades.map(u => <option key={u} value={u}>{u}</option>)}</select></label></div><div className="form-row"><label>Precio costo<input required min="0" step="0.01" type="number" value={newProduct.cost} onChange={(event) => setNewProduct({ ...newProduct, cost: event.target.value })} placeholder="0.00" /></label><label>Precio venta<input required min="0" step="0.01" type="number" value={newProduct.sale} onChange={(event) => setNewProduct({ ...newProduct, sale: event.target.value })} placeholder="0.00" /></label></div><button className="modal-primary" type="submit">{editingProduct ? 'Guardar Cambios' : 'Guardar producto'}</button></form></section></div>}
    </div>
  );
}

export default App;
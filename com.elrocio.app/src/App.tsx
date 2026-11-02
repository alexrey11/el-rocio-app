import { FormEvent, useMemo, useState, useRef } from 'react';
import { db, Product, Sale, Waste } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type IconName = 'cart' | 'shelf' | 'meat' | 'warehouse' | 'plus' | 'calendar' | 'close' | 'trend' | 'box' | 'money' | 'check' | 'trash' | 'send' | 'minus' | 'edit' | 'download' | 'upload' | 'search' | 'file-text';

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
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function App() {
  const [activeModule, setActiveModule] = useState('carretilla');
  const [isSummaryOpen, setSummaryOpen] = useState(false);
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

  const [summaryPeriod, setSummaryPeriod] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = useLiveQuery(() => db.products.where({ moduleId: activeModule }).toArray(), [activeModule]) || [];

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const salesData = useLiveQuery(async () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    let startDate, endDate;

    if (summaryPeriod === 'dia') {
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else if (summaryPeriod === 'semana') {
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const sales = await db.sales.where('date').between(startDate.toISOString(), endDate.toISOString(), true, true).toArray();
    const wastes = await db.wastes.where('date').between(startDate.toISOString(), endDate.toISOString(), true, true).toArray();
    return { sales, wastes };
  }, [summaryPeriod, selectedDate]);

  const activeLabel = modules.find((item) => item.id === activeModule)?.label ?? 'Carretilla';
  const formattedDate = useMemo(() => new Intl.DateTimeFormat('es-CU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalSales = salesData?.sales.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalProfit = salesData?.sales.reduce((sum, s) => sum + s.profit, 0) || 0;

  const detailedSales = useMemo(() => {
    if (!salesData?.sales) return [];
    const grouped: Record<string, { name: string; quantity: number; unit: string; totalRevenue: number; totalProfit: number }> = {};
    salesData.sales.forEach(sale => {
      if (!grouped[sale.productName]) {
        grouped[sale.productName] = { name: sale.productName, quantity: 0, unit: sale.unit || 'unidades', totalRevenue: 0, totalProfit: 0 };
      }
      grouped[sale.productName].quantity += sale.quantity;
      grouped[sale.productName].totalRevenue += sale.total;
      grouped[sale.productName].totalProfit += sale.profit;
    });
    return Object.values(grouped).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [salesData?.sales]);

  const detailedWastes = useMemo(() => {
    if (!salesData?.wastes) return [];
    const grouped: Record<string, { name: string; quantity: number; unit: string; costLost: number }> = {};
    salesData.wastes.forEach(waste => {
      if (!grouped[waste.productName]) {
        grouped[waste.productName] = { name: waste.productName, quantity: 0, unit: waste.unit || 'unidades', costLost: 0 };
      }
      grouped[waste.productName].quantity += waste.quantity;
      grouped[waste.productName].costLost += waste.costLost;
    });
    return Object.values(grouped);
  }, [salesData?.wastes]);

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

  // --- FUNCIONES DE RESPALDO ---
  const exportBackup = async () => {
    const allProducts = await db.products.toArray();
    const allSales = await db.sales.toArray();
    const allWastes = await db.wastes.toArray();
    const backupData = { version: 1, date: new Date().toISOString(), products: allProducts, sales: allSales, wastes: allWastes };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `elrocio_backup_${getTodayLocalString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    setNotice('Respaldo descargado.');
    setBackupOpen(false);
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
            await db.products.bulkAdd(data.products);
            await db.sales.bulkAdd(data.sales);
            await db.wastes.bulkAdd(data.wastes);
            setNotice('Datos restaurados con éxito.');
            setBackupOpen(false);
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

  // --- GENERAR PDF (CATÁLOGO) ---
  const exportCatalogPDF = async () => {
    const allProducts = await db.products.toArray();
    if (allProducts.length === 0) {
      setNotice('No hay productos para exportar.');
      return;
    }

    const doc = new jsPDF();

    // --- DISEÑO DEL PDF ---
    // Cabecera
    doc.setFillColor(46, 125, 50); // Verde
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('El Rocío', 15, 25);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Catálogo de Productos', 15, 33);
    doc.text(`Actualizado: ${new Date().toLocaleDateString()}`, 150, 33);

    let startY = 50;

    // Agrupar por módulos
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

        // @ts-ignore (para evitar error de tipado de jspdf-autotable)
        startY = doc.lastAutoTable.finalY + 15;

        // Si nos acercamos al final de la página, creamos una nueva
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      }
    }

    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Generado con El Rocío - Control de Inventario', 15, 290);
    }

    doc.save(`Catalogo_El_Rocio_${getTodayLocalString()}.pdf`);
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
          <div className="brand-mark"><span>ER</span></div>
          <div><h1>El Rocío</h1><p>Control de inventario</p></div>
        </div>
        <div className="header-actions">
          <div className="date-block"><Icon name="calendar" size={19} /><span>{formattedDate}</span></div>

          {/* BOTÓN DE EXPORTAR CATÁLOGO PDF */}
          <button className="icon-btn-blue" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} onClick={exportCatalogPDF} title="Exportar Catálogo PDF">
            <Icon name="file-text" size={20} />
          </button>

          {/* BOTÓN DE RESPALDO */}
          <button className="icon-btn-blue" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }} onClick={() => setBackupOpen(true)} title="Respaldo">
            <Icon name="download" size={20} />
          </button>

          <button className="summary-button" onClick={() => setSummaryOpen(true)}><Icon name="trend" size={20} /><span>Resumen</span></button>
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
            <div className="quick-stat"><div className="stat-icon amber-icon"><Icon name="trend" size={20} /></div><div><span>Ganancia ({summaryPeriod})</span><strong>{money(totalProfit)}</strong></div></div>
            <div className="quick-stat"><div className="stat-icon blue-icon"><Icon name="money" size={20} /></div><div><span>Ventas ({summaryPeriod})</span><strong>{money(totalSales)}</strong></div></div>
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
                  <th>Precio U.</th>
                  {showEntrada && <th>Entrada</th>}
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={`product-badge-sm ${product.accent}`}><Icon name="box" size={16} /></div>
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{money(product.sale)}</td>

                      {showEntrada && (
                        <td>
                          <button className="cell-btn" onClick={() => openActionModal(product, 'entrada')}>
                            + {product.unit}
                          </button>
                        </td>
                      )}

                      {!isWarehouse && (
                        <>
                          <td>
                            <button className="cell-btn sell" onClick={() => openActionModal(product, 'venta')}>
                              + Vender
                            </button>
                          </td>
                          <td>
                            <button className="cell-btn merma" onClick={() => openActionModal(product, 'merma')}>
                              + Merma
                            </button>
                          </td>
                        </>
                      )}

                      <td><strong style={{ color: product.stock === 0 ? 'red' : '#2e7d32' }}>{product.stock.toLocaleString('es-CU', { maximumFractionDigits: 2 })}</strong> <small>{product.unit}</small></td>
                      <td>
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
            <button className="modal-primary" onClick={exportBackup}><Icon name="download" size={18} /> Exportar Datos (Descargar)</button>

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

      {/* MODAL RESUMEN */}
      {isSummaryOpen && <div className="modal-backdrop" onClick={() => setSummaryOpen(false)}>
        <section className="modal-card summary-card" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setSummaryOpen(false)}><Icon name="close" size={22} /></button>
          <div className="modal-kicker">Reporte Financiero</div>
          <h2>Resumen de Ventas</h2>

          <div className="form-row" style={{ marginBottom: '15px' }}>
            <label>Fecha
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </label>
            <label>Tipo de Reporte
              <select value={summaryPeriod} onChange={(e) => setSummaryPeriod(e.target.value as any)}>
                <option value="dia">Día específico</option>
                <option value="semana">Semana de esa fecha</option>
                <option value="mes">Mes de esa fecha</option>
              </select>
            </label>
          </div>

          <div className="summary-total">
            <span>Ingresos Totales</span>
            <strong>{money(totalSales)}</strong>
            <small>Ganancia Neta: <strong style={{ color: '#2e7d32' }}>{money(totalProfit)}</strong></small>
          </div>

          <div className="detailed-report">
            <div className="report-header">
              <span>Producto Vendido</span>
              <span>Cantidad</span>
              <span>Ganancia</span>
            </div>
            {detailedSales.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No hay ventas en esta fecha.</p>
            ) : (
              detailedSales.map((item, index) => (
                <div className="report-row" key={index}>
                  <div className="report-name"><strong>{item.name}</strong></div>
                  <div className="report-qty">{item.quantity} {item.unit}</div>
                  <div className="report-profit" style={{ color: '#2e7d32', fontWeight: 'bold' }}>{money(item.totalProfit)}</div>
                </div>
              ))
            )}
          </div>

          {detailedWastes.length > 0 && (
            <div className="detailed-report" style={{ marginTop: '15px' }}>
              <div className="report-header" style={{ backgroundColor: '#ffebee', color: '#c62828' }}>
                <span>Mermas (Pérdidas)</span>
                <span>Cantidad</span>
                <span>Costo Perdido</span>
              </div>
              {detailedWastes.map((item, index) => (
                <div className="report-row" key={index}>
                  <div className="report-name"><strong>{item.name}</strong></div>
                  <div className="report-qty">{item.quantity} {item.unit}</div>
                  <div className="report-profit" style={{ color: '#c62828', fontWeight: 'bold' }}>{money(item.costLost)}</div>
                </div>
              ))}
            </div>
          )}

          <button className="modal-primary" onClick={() => setSummaryOpen(false)}>Cerrar</button>
        </section>
      </div>}
    </div>
  );
}

export default App;
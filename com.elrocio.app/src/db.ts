import Dexie, { Table } from 'dexie';

export interface Product {
    id?: number;
    name: string;
    stock: number;
    unit: string;
    cost: number;
    sale: number;
    accent: string;
    moduleId: string;
    // NUEVOS (se usarán en módulos 3-5)
    minStock?: number;
    barcode?: string;
}

export interface Sale {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    total: number;
    profit: number;
    date: string;
    moduleId: string;
    unit: string;
    paymentMethod?: 'efectivo' | 'transferencia' | 'mixto';
    cashAmount?: number;
    transferAmount?: number;
    // NUEVOS (módulo 5)
    currency?: 'CUP' | 'USD' | 'EUR' | 'MLC';
    amountOriginal?: number;
    rateUsed?: number;
}

export interface Waste {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    costLost: number;
    date: string;
    moduleId: string;
    unit: string;
    motivo?: string;
}

export interface Transfer {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    fromModule: string;
    toModule: string;
    date: string;
    unit: string;
}

export interface Expense {
    id?: number;
    date: string;
    description: string;
    category: string;
    amount: number;
}

export interface Settings {
    id: number;
    rateUSD: number;
    rateEUR: number;
    rateMLC: number;
    updatedAt: string;
    // NUEVOS — seguridad
    pinHash?: string;
    pinEnabled?: boolean;
    // NUEVOS — backup
    lastBackupAt?: string;
    autoBackupEnabled?: boolean;
    // NUEVOS — preferencias
    darkMode?: boolean;
}

// NUEVO — cierre de caja (módulo 2)
export interface Cierre {
    id?: number;
    date: string;               // fecha del día cerrado YYYY-MM-DD
    closedAt: string;           // ISO timestamp del momento del cierre
    totalVentas: number;
    totalGanancias: number;
    totalGastos: number;
    totalMermas: number;
    efectivoEsperado: number;   // calculado
    efectivoReal: number;       // lo que el usuario contó
    diferencia: number;         // real - esperado
    notas?: string;
}

class ElRocioDB extends Dexie {
    products!: Table<Product, number>;
    sales!: Table<Sale, number>;
    wastes!: Table<Waste, number>;
    transfers!: Table<Transfer, number>;
    expenses!: Table<Expense, number>;
    settings!: Table<Settings, number>;
    cierres!: Table<Cierre, number>;

    constructor() {
        super('ElRocioDB');

        this.version(1).stores({
            products: '++id, name, moduleId',
            sales: '++id, date, productId',
            wastes: '++id, date, productId',
            transfers: '++id, date',
            expenses: '++id, date',
            settings: 'id',
        });

        this.version(2).stores({
            products: '++id, name, moduleId',
            sales: '++id, date, productId, moduleId',
            wastes: '++id, date, productId, moduleId',
            transfers: '++id, date',
            expenses: '++id, date',
            settings: 'id',
        });

        // v3: índices optimizados + barcode
        this.version(3).stores({
            products: '++id, name, moduleId, barcode',
            sales: '++id, date, productId, moduleId, [date+moduleId]',
            wastes: '++id, date, productId, moduleId, [date+moduleId]',
            transfers: '++id, date',
            expenses: '++id, date',
            settings: 'id',
        });

        // v5: cierre de caja
        this.version(5).stores({
            products: '++id, name, moduleId, barcode',
            sales: '++id, date, productId, moduleId, [date+moduleId]',
            wastes: '++id, date, productId, moduleId, [date+moduleId]',
            transfers: '++id, date',
            expenses: '++id, date',
            settings: 'id',
            cierres: '++id, date',
        });
    }
}

export const db = new ElRocioDB();
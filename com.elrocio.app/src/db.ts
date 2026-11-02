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
}

// NUEVA TABLA: Para registrar las pérdidas
export interface Waste {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    costLost: number; // Cuánto dinero se perdió (costo * cantidad)
    date: string;
    moduleId: string;
    unit: string;
}

class ElRocioDB extends Dexie {
    products!: Table<Product, number>;
    sales!: Table<Sale, number>;
    wastes!: Table<Waste, number>; // <-- Añadido

    constructor() {
        super('ElRocioDatabase');
        this.version(1).stores({
            products: '++id, name, moduleId',
            sales: '++id, productId, date, moduleId',
            wastes: '++id, productId, date, moduleId' // <-- Añadido
        });
    }
}

export const db = new ElRocioDB();
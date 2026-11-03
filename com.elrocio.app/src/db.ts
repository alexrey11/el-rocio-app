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

export interface Waste {
    id?: number;
    productId: number;
    productName: string;
    quantity: number;
    costLost: number;
    date: string;
    moduleId: string;
    unit: string;
}

// NUEVA TABLA: Para registrar los traspasos del almacén
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

class ElRocioDB extends Dexie {
    products!: Table<Product, number>;
    sales!: Table<Sale, number>;
    wastes!: Table<Waste, number>;
    transfers!: Table<Transfer, number>; // <-- Añadido

    constructor() {
        super('ElRocioDatabase');
        this.version(1).stores({
            products: '++id, name, moduleId',
            sales: '++id, productId, date, moduleId',
            wastes: '++id, productId, date, moduleId'
        });

        // Versión 2: Añadimos la tabla de traspasos sin perder los datos anteriores
        this.version(2).stores({
            transfers: '++id, productId, date, fromModule, toModule'
        });
    }
}

export const db = new ElRocioDB();
import { db } from './db';

export const seedDatabase = async () => {
    const count = await db.products.count();
    if (count === 0) {
        // Productos de prueba para la Carretilla (basados en tu foto)
        await db.products.bulkAdd([
            { name: 'Ají Panca', stock: 50, unit: 'kg', cost: 1.50, sale: 2.50, accent: 'bg-red-100', moduleId: 'carretilla' },
            { name: 'Huacatay', stock: 20, unit: 'kg', cost: 0.50, sale: 1.00, accent: 'bg-green-100', moduleId: 'carretilla' },
            { name: 'Laurel', stock: 100, unit: 'unid', cost: 0.10, sale: 0.20, accent: 'bg-gray-100', moduleId: 'carretilla' },
            { name: 'Pollo Entero', stock: 15, unit: 'kg', cost: 8.00, sale: 12.00, accent: 'bg-yellow-100', moduleId: 'carnicos' },
        ]);
        console.log('Base de datos inicializada con productos de prueba');
    }
};
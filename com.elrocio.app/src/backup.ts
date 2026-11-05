// src/backup.ts
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { db } from './db';
import { getTodayLocalString } from './utils/dates'; // o donde tengas getTodayLocalString

const BACKUP_VERSION = 5;
const BACKUP_FILE_PREFIX = 'elrocio_backup_';

/** Datos completos serializables para respaldo. */
const buildBackupData = async () => ({
    version: BACKUP_VERSION,
    date: new Date().toISOString(),
    products: await db.products.toArray(),
    sales: await db.sales.toArray(),
    wastes: await db.wastes.toArray(),
    transfers: await db.transfers.toArray(),
    expenses: await db.expenses.toArray(),
    cierres: await db.cierres.toArray(),
    settings: await db.settings.toArray(),
});

/** Descarga/comparte el JSON. Devuelve true si se completó. */
export const exportBackup = async (): Promise<boolean> => {
    try {
        const data = await buildBackupData();
        const dataStr = JSON.stringify(data);
        const fileName = `${BACKUP_FILE_PREFIX}${getTodayLocalString()}.json`;

        if (Capacitor.isNativePlatform()) {
            const result = await Filesystem.writeFile({
                path: fileName,
                data: dataStr,
                directory: Directory.Cache,
                encoding: Encoding.UTF8,
            });
            await Share.share({
                title: 'Respaldo El Rocío',
                text: 'Aquí tienes tu respaldo.',
                url: result.uri,
                dialogTitle: 'Guardar o compartir respaldo',
            });
        } else {
            const dataUri = 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const a = document.createElement('a');
            a.href = dataUri;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        // Marca la fecha del último backup
        const settings = await db.settings.get(1);
        if (settings) {
            await db.settings.update(1, { lastBackupAt: new Date().toISOString() });
        }

        return true;
    } catch (err) {
        console.error('[Backup] Error al exportar:', err);
        return false;
    }
};

/** Restaura desde archivo. Borra todo antes. */
export const importBackup = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (!data.products || !data.sales || !data.wastes) {
                    resolve(false);
                    return;
                }

                await Promise.all([
                    db.products.clear(),
                    db.sales.clear(),
                    db.wastes.clear(),
                    db.transfers.clear(),
                    db.expenses.clear(),
                    db.cierres.clear(),
                ]);

                await db.products.bulkAdd(data.products);
                await db.sales.bulkAdd(data.sales);
                await db.wastes.bulkAdd(data.wastes);
                if (data.transfers?.length) await db.transfers.bulkAdd(data.transfers);
                if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
                if (data.cierres?.length) await db.cierres.bulkAdd(data.cierres);

                resolve(true);
            } catch (err) {
                console.error('[Backup] Error al importar:', err);
                resolve(false);
            }
        };
        reader.readAsText(file);
    });
};

/** Días transcurridos desde el último backup (o Infinity si nunca). */
export const getDaysSinceLastBackup = async (): Promise<number> => {
    const s = await db.settings.get(1);
    if (!s?.lastBackupAt) return Infinity;
    const diffMs = Date.now() - new Date(s.lastBackupAt).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/** ¿Debe mostrarse el banner de "haz respaldo"? */
export const shouldWarnBackup = async (): Promise<boolean> => {
    const s = await db.settings.get(1);
    if (s?.autoBackupEnabled === false) return false;
    const days = await getDaysSinceLastBackup();
    return days >= 1; // avisa a partir de 1 día sin backup
};
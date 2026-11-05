// src/security.ts
const SALT = 'elrocio-2025-v1';

/** Convierte "1234" → hash SHA-256 hex (64 chars). */
export const hashPin = async (pin: string): Promise<string> => {
    const data = new TextEncoder().encode(`${SALT}:${pin}`);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

/** Valida el PIN. `pin` es lo que el usuario tecleó, `stored` es el hash guardado. */
export const verifyPin = async (pin: string, stored: string): Promise<boolean> => {
    if (!stored) return true; // sin PIN configurado → siempre pasa
    const hash = await hashPin(pin);
    // Comparación de tiempo constante (evita timing attacks, aunque aquí es overkill)
    if (hash.length !== stored.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ stored.charCodeAt(i);
    return diff === 0;
};
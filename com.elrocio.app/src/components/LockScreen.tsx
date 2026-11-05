// src/components/LockScreen.tsx
import { useState } from 'react';
import { verifyPin } from '../security';

interface LockScreenProps {
    pinHash: string;
    onUnlock: () => void;
    onForgot?: () => void;
}

export const LockScreen = ({ pinHash, onUnlock, onForgot }: LockScreenProps) => {
    const [entered, setEntered] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const press = async (digit: string) => {
        if (checking) return;
        setError('');
        const next = entered + digit;
        setEntered(next);

        if (next.length === pinHash.length && pinHash.length <= 6) {
            // Cuando llega a 4-6 dígitos, valida
            setChecking(true);
            const ok = await verifyPin(next, pinHash);
            if (ok) {
                onUnlock();
            } else {
                setError('PIN incorrecto');
                setTimeout(() => setEntered(''), 300);
            }
            setChecking(false);
        }
    };

    const del = () => { if (!checking) setEntered((p) => p.slice(0, -1)); };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'linear-gradient(135deg, #047857 0%, #059669 60%, #10b981 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            userSelect: 'none',
        }}>
            <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                backgroundColor: 'rgba(255,255,255,.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', boxShadow: '0 12px 32px -8px rgba(0,0,0,.3)',
            }}>
                <img src="/logo.png" alt="El Rocío"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '18px' }} />
            </div>

            <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
                El Rocío
            </div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '0.85rem', marginBottom: '28px' }}>
                Introduce tu PIN
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', minHeight: '20px' }}>
                {Array.from({ length: Math.max(pinHash.length, 4) }).map((_, i) => (
                    <div key={i} style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        backgroundColor: entered.length > i ? 'white' : 'rgba(255,255,255,.25)',
                        transition: 'background .15s ease',
                    }} />
                ))}
            </div>

            {error && (
                <div style={{
                    color: '#fecaca', fontSize: '0.85rem', fontWeight: 700,
                    marginBottom: '12px', minHeight: '20px',
                }}>
                    {error}
                </div>
            )}

            {/* Keypad */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
                maxWidth: '280px', width: '100%',
            }}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                    <button key={d} onClick={() => press(d)} style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        border: '1.5px solid rgba(255,255,255,.3)',
                        backgroundColor: 'rgba(255,255,255,.12)',
                        color: 'white', fontSize: '1.5rem', fontWeight: 700,
                        cursor: 'pointer', backdropFilter: 'blur(6px)',
                        transition: 'all .12s ease',
                    }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(.92)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >{d}</button>
                ))}
                <div />
                <button onClick={() => press('0')} style={{
                    aspectRatio: '1', borderRadius: '50%',
                    border: '1.5px solid rgba(255,255,255,.3)',
                    backgroundColor: 'rgba(255,255,255,.12)',
                    color: 'white', fontSize: '1.5rem', fontWeight: 700,
                    cursor: 'pointer', backdropFilter: 'blur(6px)',
                }}>0</button>
                <button onClick={del} style={{
                    aspectRatio: '1', borderRadius: '50%',
                    border: 'none', backgroundColor: 'transparent',
                    color: 'white', fontSize: '1.3rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>⌫</button>
            </div>

            {onForgot && (
                <button onClick={onForgot} style={{
                    marginTop: '24px', background: 'none', border: 'none',
                    color: 'rgba(255,255,255,.7)', fontSize: '0.8rem',
                    fontWeight: 600, cursor: 'pointer', textDecoration: 'underline',
                }}>
                    Olvidé mi PIN
                </button>
            )}
        </div>
    );
};
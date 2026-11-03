import { ShoppingCart, Home, Store, Beef, Package } from 'lucide-react';

interface HeaderProps {
    currentModule: string;
    setCurrentModule: (module: string) => void;
    cartCount: number;
    onCartClick: () => void;
}

export default function Header({ currentModule, setCurrentModule, cartCount, onCartClick }: HeaderProps) {
    const modules = [
        { id: 'carretilla', name: 'Carretilla', icon: Store },
        { id: 'estante', name: 'Estante', icon: Home },
        { id: 'carnicos', name: 'Cárnicos', icon: Beef },
        { id: 'almacen', name: 'Almacén', icon: Package },
    ];

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-50">
            {/* Logo y Módulos */}
            <div className="flex items-center gap-6">
                <img src="./logo.png" alt="El Rocío" className="h-10 w-auto object-contain" />

                <nav className="flex gap-2">
                    {modules.map((mod) => {
                        const Icon = mod.icon;
                        const isActive = currentModule === mod.id;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => setCurrentModule(mod.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${isActive
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={20} />
                                {mod.name}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Carrito */}
            <button
                onClick={onCartClick}
                className="relative p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
                <ShoppingCart size={24} className="text-gray-700" />
                {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                        {cartCount}
                    </span>
                )}
            </button>
        </header>
    );
}
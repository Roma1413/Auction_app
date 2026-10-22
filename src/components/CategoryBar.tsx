import React from 'react';
import { 
  Watch, 
  Laptop, 
  Car, 
  Trophy, 
  Gamepad2, 
  Guitar,
  Grid
} from 'lucide-react';
import { useAuction } from '../context/useAuction';

export const CategoryBar: React.FC = () => {
  const { activeCategory, setActiveCategory, auctions } = useAuction();

  const categoryList = [
    { name: 'All', icon: Grid },
    { name: 'Watches & Jewelry', icon: Watch },
    { name: 'Electronics', icon: Laptop },
    { name: 'Vehicles', icon: Car },
    { name: 'Collectibles & Art', icon: Trophy },
    { name: 'Gaming', icon: Gamepad2 },
    { name: 'Music & Instruments', icon: Guitar }
  ];

  return (
    <div className="category-bar border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
          {categoryList.map(({ name, icon: Icon }) => {
            const isActive = activeCategory === name;
            const count = name === 'All' 
              ? auctions.length 
              : auctions.filter(a => a.category === name).length;

            return (
              <button
                key={name}
                onClick={() => setActiveCategory(name)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20 '
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

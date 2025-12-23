import {
    Home,
    User,
    Palette,
    Package,
    Flag,
} from 'lucide-react';

import { Dock, DockIcon, DockItem, DockLabel } from './ui/dock';
import { useAudio } from '../hooks/useAudio';

const data = [
    {
        title: 'Garage',
        icon: (
            <Home className='h-full w-full text-red-500' />
        ),
        href: '#',
    },
    {
        title: 'Paint Shop',
        icon: (
            <Palette className='h-full w-full text-red-500' />
        ),
        href: '#',
    },
    {
        title: 'Marketplace',
        icon: (
            <Package className='h-full w-full text-red-500' />
        ),
        href: '#',
    },
    {
        title: 'Race',
        icon: (
            <Flag className='h-full w-full text-red-500' />
        ),
        href: '#',
    },
    {
        title: 'Profile',
        icon: (
            <User className='h-full w-full text-red-500' />
        ),
        href: '#',
    },
];

export function AppleStyleDock({ activePage, setActivePage }) {
    const { playClick } = useAudio();

    const handleNavClick = (title) => {
        playClick();
        if (setActivePage) setActivePage(title);
    };

    return (
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50'>
            <Dock className='items-end gap-6 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10' magnification={60} distance={140}>
                {data.map((item, idx) => (
                    <DockItem
                        key={idx}
                        className='aspect-square rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer transition-colors'
                        onClick={() => handleNavClick(item.title)}
                    >
                        <DockLabel>{item.title}</DockLabel>
                        <DockIcon>{item.icon}</DockIcon>
                    </DockItem>
                ))}
            </Dock>
        </div>
    );
}

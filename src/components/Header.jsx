import React from 'react';

export default function Header({ activePage, setActivePage }) {
    const pages = ['Garage', 'Marketplace', 'Profile'];
    return (
        <header className="fixed top-0 left-0 w-full h-16 bg-[#1a1a1a] flex items-center justify-between px-6 z-20">
            <h1 className="text-3xl font-bold italic tracking-wider" style={{ fontFamily: '"Exo 2", sans-serif' }}>
                TURBODASH
            </h1>
            <nav className="flex space-x-6">
                {pages.map((page) => (
                    <button
                        key={page}
                        className={`text-sm uppercase ${activePage === page ? 'text-red-600' : 'text-gray-300'} hover:text-white`}
                        onClick={() => setActivePage(page)}
                    >
                        {page}
                    </button>
                ))}
            </nav>
        </header>
    );
}

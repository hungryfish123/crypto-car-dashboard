import React from "react";
import { FloatingNavAlwaysVisible } from "./ui/floating-navbar-visible";
import { Home, Car, User } from "lucide-react";

export function FloatingNavDemo({ activePage, setActivePage }) {
    const navItems = [
        {
            name: "Garage",
            link: "#garage",
            icon: <Home className="h-4 w-4 text-neutral-500 dark:text-white" />,
            onClick: () => setActivePage && setActivePage('Garage'),
        },
        {
            name: "Marketplace",
            link: "#marketplace",
            icon: <Car className="h-4 w-4 text-neutral-500 dark:text-white" />,
            onClick: () => setActivePage && setActivePage('Marketplace'),
        },
        {
            name: "Profile",
            link: "#profile",
            icon: <User className="h-4 w-4 text-neutral-500 dark:text-white" />,
            onClick: () => setActivePage && setActivePage('Profile'),
        },
    ];

    return (
        <div className="relative w-full">
            <FloatingNavAlwaysVisible navItems={navItems} />
        </div>
    );
}

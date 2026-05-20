import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({
    title,
    actions,
    children,
}: {
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <div className="content-shell">
                <Sidebar
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen((prev) => !prev)}
                />
                <main className="rc-main">
                    <div className="rc-topbar">
                        <div className="rc-title">{title}</div>
                        <div className="rc-actions">{actions}</div>
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}

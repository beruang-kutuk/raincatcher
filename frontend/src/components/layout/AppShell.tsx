import Sidebar from "././Sidebar";

export default function AppShell({
    title,
    actions,
    children,
}: {
    title: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rc-page">
            <div className="rc-shell">
                <Sidebar />
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

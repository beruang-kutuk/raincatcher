import ProfileMenu from "./ProfileMenu";

type AdminTopbarProps = {
    kicker?: string;
    title: string;
    subtitle?: string;
    primaryAction?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    inlineMessage?: string;
};

export default function AdminTopbar({
    kicker,
    title,
    subtitle,
    primaryAction,
    secondaryAction,
    inlineMessage,
}: AdminTopbarProps) {
    return (
        <div className="admin-topbar">
            <div>
                {kicker && <span className="admin-kicker">{kicker}</span>}
                <h1 className="admin-page-title">{title}</h1>
                {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
            </div>

            <div className="dashboard-actions">
                {inlineMessage && <span className="admin-save-message">{inlineMessage}</span>}
                {secondaryAction}
                {primaryAction}
                <ProfileMenu />
            </div>
        </div>
    );
}

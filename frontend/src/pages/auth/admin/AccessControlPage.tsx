import { useState } from "react";
import {
    ShieldCheck,
    SlidersHorizontal,
    UserCog,
    Users,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import ProfileMenu from "../../../components/layout/ProfileMenu";

type AccessStatus = "active" | "limited" | "suspended" | "planned";
type AccessRole = "SYSTEM_ADMIN" | "LAB_ASSISTANT" | "VIEWER";
type ManagedUserField = "role" | "accessScope" | "status";

type UserAccessRow = {
    id: number;
    name: string;
    email: string;
    role: AccessRole;
    accessScope: string;
    status: AccessStatus;
};

type RolePolicy = {
    id: number;
    role: AccessRole;
    description: string;
    permissions: string[];
    status: AccessStatus;
};

type NewUserForm = {
    name: string;
    email: string;
    role: Exclude<AccessRole, "SYSTEM_ADMIN">;
    accessScope: string;
};

const roleLabels: Record<AccessRole, string> = {
    SYSTEM_ADMIN: "Super Admin",
    LAB_ASSISTANT: "Lab Assistant",
    VIEWER: "Viewer",
};

const scopeOptions = [
    "Lab monitoring, reports, anomaly workflow",
    "Telemetry and anomaly review",
    "Tank images and maintenance review",
    "Reports and benchmark summaries",
    "Read-only monitoring evidence",
];

const initialUserAccessRows: UserAccessRow[] = [
    {
        id: 1,
        name: "Super Admin",
        email: "admin@raincatcher.local",
        role: "SYSTEM_ADMIN",
        accessScope: "Full platform control",
        status: "active",
    },
    {
        id: 2,
        name: "Jasmine Tan",
        email: "jasmine@example.com",
        role: "LAB_ASSISTANT",
        accessScope: "Lab monitoring, reports, anomaly workflow",
        status: "active",
    },
    {
        id: 3,
        name: "Maintenance Team",
        email: "maintenance@raincatcher.local",
        role: "LAB_ASSISTANT",
        accessScope: "Tank images and maintenance review",
        status: "limited",
    },
];

const rolePolicies: RolePolicy[] = [
    {
        id: 1,
        role: "SYSTEM_ADMIN",
        description: "Superadmin role with full authority over users, system rules, and configuration.",
        permissions: [
            "View admin dashboard",
            "Manage lab users",
            "Assign roles and access scopes",
            "Suspend or reactivate lab accounts",
            "Manage thresholds",
            "Configure report and benchmark rules",
        ],
        status: "active",
    },
    {
        id: 2,
        role: "LAB_ASSISTANT",
        description: "Operates the RWH monitoring workflow.",
        permissions: [
            "View lab dashboard",
            "Review telemetry",
            "Resolve anomalies",
            "View tank images",
            "Generate reports",
            "Run simulations",
        ],
        status: "active",
    },
    {
        id: 3,
        role: "VIEWER",
        description: "Read-only role for future supervisors or external evaluators.",
        permissions: [
            "View dashboards",
            "View reports",
            "View benchmark summaries",
        ],
        status: "planned",
    },
];

function getAccessStatusClass(status: AccessStatus) {
    if (status === "planned" || status === "limited") return "admin-status-warning";
    if (status === "suspended") return "admin-status-critical";
    return "admin-status-normal";
}

function getNextId(users: UserAccessRow[]) {
    return Math.max(...users.map((user) => user.id), 0) + 1;
}

export default function AccessControlPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedRole, setSelectedRole] = useState(rolePolicies[0]);
    const [users, setUsers] = useState<UserAccessRow[]>(initialUserAccessRows);
    const [newUser, setNewUser] = useState<NewUserForm>({
        name: "",
        email: "",
        role: "LAB_ASSISTANT",
        accessScope: scopeOptions[0],
    });

    const labUsers = users.filter((user) => user.role !== "SYSTEM_ADMIN");
    const activeLabUsers = labUsers.filter((user) => user.status === "active").length;
    const restrictedUsers = labUsers.filter(
        (user) => user.status === "limited" || user.status === "suspended",
    ).length;

    function updateUserAccess(
        id: number,
        field: ManagedUserField,
        value: string,
    ) {
        setUsers((prev) =>
            prev.map((user) => {
                if (user.id !== id || user.role === "SYSTEM_ADMIN") return user;

                if (field === "role") {
                    return {
                        ...user,
                        role: value as Exclude<AccessRole, "SYSTEM_ADMIN">,
                    };
                }

                if (field === "status") {
                    return {
                        ...user,
                        status: value as Exclude<AccessStatus, "planned">,
                    };
                }

                return {
                    ...user,
                    accessScope: value,
                };
            })
        );
    }

    function toggleUserSuspension(id: number) {
        setUsers((prev) =>
            prev.map((user) => {
                if (user.id !== id || user.role === "SYSTEM_ADMIN") return user;

                return {
                    ...user,
                    status: user.status === "suspended" ? "active" : "suspended",
                };
            })
        );
    }

    function addLabUser(event: React.FormEvent) {
        event.preventDefault();

        const name = newUser.name.trim();
        const email = newUser.email.trim();

        if (!name || !email) return;

        setUsers((prev) => [
            ...prev,
            {
                id: getNextId(prev),
                name,
                email,
                role: newUser.role,
                accessScope: newUser.accessScope,
                status: "active",
            },
        ]);

        setNewUser({
            name: "",
            email: "",
            role: "LAB_ASSISTANT",
            accessScope: scopeOptions[0],
        });
    }

    return (
        <div className={`app-shell-fixed ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
            />

            <div className="content-shell">
                <main className="dashboard-content-scroll">
                    <div className="admin-page page-container">
                        <div className="admin-topbar">
                            <div>
                                <span className="admin-kicker">Super Admin RBAC</span>
                                <h1 className="admin-page-title">Lab User Control</h1>
                                <p className="admin-page-subtitle">
                                    Superadmin can manage lab users, assign access scope,
                                    suspend accounts, and keep admin controls separated from
                                    the lab monitoring workflow.
                                </p>
                            </div>

                            <div className="dashboard-actions">
                                <button className="admin-secondary-btn" type="button">
                                    Frontend Mock Policy
                                </button>
                                <ProfileMenu />
                            </div>
                        </div>

                        <div className="admin-summary-grid">
                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-normal">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-normal">
                                        superadmin
                                    </span>
                                </div>
                                <p className="admin-summary-label">Admin Authority</p>
                                <h3 className="admin-summary-value">Full</h3>
                                <p className="admin-summary-meta">
                                    Superadmin owns user, threshold, simulation, and benchmark controls.
                                </p>
                            </article>

                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-normal">
                                        <Users size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-normal">
                                        active
                                    </span>
                                </div>
                                <p className="admin-summary-label">Lab Users</p>
                                <h3 className="admin-summary-value">{labUsers.length}</h3>
                                <p className="admin-summary-meta">
                                    {activeLabUsers} active users can access lab modules.
                                </p>
                            </article>

                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-warning">
                                        <UserCog size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-warning">
                                        controlled
                                    </span>
                                </div>
                                <p className="admin-summary-label">Restricted Users</p>
                                <h3 className="admin-summary-value">{restrictedUsers}</h3>
                                <p className="admin-summary-meta">
                                    Limited or suspended accounts remain visible for audit.
                                </p>
                            </article>

                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-normal">
                                        <SlidersHorizontal size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-normal">
                                        enforced
                                    </span>
                                </div>
                                <p className="admin-summary-label">Route Groups</p>
                                <h3 className="admin-summary-value">2</h3>
                                <p className="admin-summary-meta">
                                    Admin and lab route groups are separated by role guard.
                                </p>
                            </article>
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel admin-management-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Manage Lab Users</h2>
                                        <p>Change role, scope, and account status from one table.</p>
                                    </div>
                                    <Users size={20} />
                                </div>

                                <div className="admin-table-wrap">
                                    <table className="admin-table admin-user-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Scope</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((row) => {
                                                const isSuperAdmin = row.role === "SYSTEM_ADMIN";

                                                return (
                                                    <tr key={row.id}>
                                                        <td>{row.name}</td>
                                                        <td>{row.email}</td>
                                                        <td>
                                                            {isSuperAdmin ? (
                                                                <span className="admin-role-lock">
                                                                    {roleLabels[row.role]}
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    className="admin-inline-select"
                                                                    value={row.role}
                                                                    onChange={(event) =>
                                                                        updateUserAccess(row.id, "role", event.target.value)
                                                                    }
                                                                >
                                                                    <option value="LAB_ASSISTANT">Lab Assistant</option>
                                                                    <option value="VIEWER">Viewer</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {isSuperAdmin ? (
                                                                row.accessScope
                                                            ) : (
                                                                <select
                                                                    className="admin-inline-select wide"
                                                                    value={row.accessScope}
                                                                    onChange={(event) =>
                                                                        updateUserAccess(row.id, "accessScope", event.target.value)
                                                                    }
                                                                >
                                                                    {scopeOptions.map((scope) => (
                                                                        <option key={scope} value={scope}>
                                                                            {scope}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {isSuperAdmin ? (
                                                                <span className={`admin-status-pill ${getAccessStatusClass(row.status)}`}>
                                                                    {row.status}
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    className={`admin-inline-select status ${getAccessStatusClass(row.status)}`}
                                                                    value={row.status}
                                                                    onChange={(event) =>
                                                                        updateUserAccess(row.id, "status", event.target.value)
                                                                    }
                                                                >
                                                                    <option value="active">Active</option>
                                                                    <option value="limited">Limited</option>
                                                                    <option value="suspended">Suspended</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="admin-text-btn"
                                                                disabled={isSuperAdmin}
                                                                onClick={() => toggleUserSuspension(row.id)}
                                                            >
                                                                {row.status === "suspended" ? "Reactivate" : "Suspend"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Add Lab User</h2>
                                        <p>Create a mock user account for the lab workflow.</p>
                                    </div>
                                    <UserCog size={20} />
                                </div>

                                <form className="admin-user-form" onSubmit={addLabUser}>
                                    <label className="admin-field">
                                        Name
                                        <input
                                            value={newUser.name}
                                            onChange={(event) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    name: event.target.value,
                                                }))
                                            }
                                            placeholder="e.g. Lab Assistant 02"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        Email
                                        <input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(event) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    email: event.target.value,
                                                }))
                                            }
                                            placeholder="name@example.com"
                                        />
                                    </label>

                                    <label className="admin-field">
                                        Role
                                        <select
                                            value={newUser.role}
                                            onChange={(event) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    role: event.target.value as NewUserForm["role"],
                                                }))
                                            }
                                        >
                                            <option value="LAB_ASSISTANT">Lab Assistant</option>
                                            <option value="VIEWER">Viewer</option>
                                        </select>
                                    </label>

                                    <label className="admin-field">
                                        Access scope
                                        <select
                                            value={newUser.accessScope}
                                            onChange={(event) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    accessScope: event.target.value,
                                                }))
                                            }
                                        >
                                            {scopeOptions.map((scope) => (
                                                <option key={scope} value={scope}>
                                                    {scope}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <button className="admin-primary-btn" type="submit">
                                        Add Lab User
                                    </button>
                                </form>
                            </section>
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Role Policies</h2>
                                        <p>Select a role to inspect its current permissions.</p>
                                    </div>
                                    <ShieldCheck size={20} />
                                </div>

                                <div className="admin-role-tabs">
                                    {rolePolicies.map((policy) => (
                                        <button
                                            key={policy.id}
                                            type="button"
                                            className={`admin-role-tab ${selectedRole.id === policy.id ? "active" : ""}`}
                                            onClick={() => setSelectedRole(policy)}
                                        >
                                            {roleLabels[policy.role]}
                                        </button>
                                    ))}
                                </div>

                                <div className="admin-role-detail">
                                    <div className="admin-task-top">
                                        <div>
                                            <h3>{roleLabels[selectedRole.role]}</h3>
                                            <p>{selectedRole.description}</p>
                                        </div>
                                        <span className={`admin-status-pill ${getAccessStatusClass(selectedRole.status)}`}>
                                            {selectedRole.status}
                                        </span>
                                    </div>

                                    <div className="admin-permission-list">
                                        {selectedRole.permissions.map((permission) => (
                                            <div key={permission} className="admin-permission-item">
                                                <span />
                                                {permission}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Route Access Matrix</h2>
                                        <p>Frontend routing now enforces these access groups.</p>
                                    </div>
                                    <UserCog size={20} />
                                </div>

                                <div className="admin-access-matrix single">
                                    <div>
                                        <h3>Super Admin</h3>
                                        <p>/admin/dashboard, /admin/system, /admin/access, /settings</p>
                                    </div>
                                    <div>
                                        <h3>Lab Assistant</h3>
                                        <p>/lab/dashboard, /lab/telemetry, /lab/forecast, /lab/anomalies, /lab/images, /lab/simulation, /lab/reports, /settings</p>
                                    </div>
                                    <div>
                                        <h3>Viewer</h3>
                                        <p>Planned read-only route group for future supervisors and evaluators.</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

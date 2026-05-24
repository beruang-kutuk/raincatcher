import { Fragment, useMemo, useState, type FormEvent } from "react";
import {
    Check,
    Eye,
    Pause,
    Pencil,
    ShieldCheck,
    UserCog,
    Users,
} from "lucide-react";
import "../../../styles/dashboard.css";
import "../../../styles/admin.css";
import Sidebar from "../../../components/layout/Sidebar";
import AdminTopbar from "../../../components/layout/AdminTopbar";
import {
    getPermissionLabel,
    initialManagedUsers,
    permissionDefinitions,
    roleLabels,
    rolePolicies,
    type ManagedRole,
    type ManagedUser,
    type UserAccessStatus,
} from "../../../services/adminData";

type SelectedUserState = {
    id: number;
    mode: "view" | "edit";
} | null;

type NewUserForm = {
    name: string;
    email: string;
    phone: string;
    role: Exclude<ManagedRole, "SUPER_ADMIN">;
};

type EditableUserField = "name" | "email" | "phone" | "role" | "status";

const assignableRoles: Array<Exclude<ManagedRole, "SUPER_ADMIN">> = [
    "LAB_ASSISTANT",
    "MAINTENANCE",
    "VIEWER",
];

function getStatusClass(status: UserAccessStatus | "Active" | "Planned") {
    if (status === "Suspended") return "admin-status-critical";
    if (status === "Pending" || status === "Planned") return "admin-status-warning";
    return "admin-status-normal";
}

function getNextId(users: ManagedUser[]) {
    return Math.max(...users.map((user) => user.id), 0) + 1;
}

export default function AccessControlPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [users, setUsers] = useState<ManagedUser[]>(initialManagedUsers);
    const [selectedUser, setSelectedUser] = useState<SelectedUserState>(null);
    const [selectedRole, setSelectedRole] = useState(rolePolicies[0]);
    const [newUser, setNewUser] = useState<NewUserForm>({
        name: "",
        email: "",
        phone: "",
        role: "LAB_ASSISTANT",
    });

    const managedUsers = useMemo(
        () => users.filter((user) => user.role !== "SUPER_ADMIN"),
        [users],
    );
    const activeUsers = managedUsers.filter((user) => user.status === "Active").length;
    const suspendedUsers = managedUsers.filter((user) => user.status === "Suspended").length;

    function updateUser(id: number, field: EditableUserField, value: string) {
        setUsers((prev) =>
            prev.map((user) => {
                if (user.id !== id) return user;
                if (user.role === "SUPER_ADMIN" && (field === "role" || field === "status")) {
                    return user;
                }

                return {
                    ...user,
                    [field]: value,
                } as ManagedUser;
            }),
        );
    }

    function toggleUserSuspension(id: number) {
        setUsers((prev) =>
            prev.map((user) => {
                if (user.id !== id || user.role === "SUPER_ADMIN") return user;

                return {
                    ...user,
                    status: user.status === "Suspended" ? "Active" : "Suspended",
                };
            }),
        );
    }

    function addUser(event: FormEvent) {
        event.preventDefault();

        const name = newUser.name.trim();
        const email = newUser.email.trim();
        const phone = newUser.phone.trim();

        if (!name || !email) return;

        setUsers((prev) => [
            ...prev,
            {
                id: getNextId(prev),
                name,
                email,
                phone: phone || "Not provided",
                role: newUser.role,
                status: "Active",
                lastLogin: "Not signed in yet",
            },
        ]);

        setNewUser({
            name: "",
            email: "",
            phone: "",
            role: "LAB_ASSISTANT",
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
                        <AdminTopbar
                            kicker="Super Admin RBAC"
                            title="Access Control"
                            subtitle="Manage users, assign roles, inspect permissions, and keep system-wide controls separated from Lab Assistant personal preferences."
                            secondaryAction={
                                <button className="admin-secondary-btn" type="button">Frontend Policy</button>
                            }
                        />

                        <div className="admin-summary-grid">
                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-normal">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-normal">
                                        admin
                                    </span>
                                </div>
                                <p className="admin-summary-label">Admin Authority</p>
                                <h3 className="admin-summary-value">Full</h3>
                                <p className="admin-summary-meta">
                                    Admin can manage users, roles, permissions, and system controls.
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
                                <p className="admin-summary-label">Managed Users</p>
                                <h3 className="admin-summary-value">{managedUsers.length}</h3>
                                <p className="admin-summary-meta">
                                    {activeUsers} active non-admin accounts can use assigned modules.
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
                                <p className="admin-summary-label">Suspended Users</p>
                                <h3 className="admin-summary-value">{suspendedUsers}</h3>
                                <p className="admin-summary-meta">
                                    Suspended accounts remain visible for audit history.
                                </p>
                            </article>

                            <article className="admin-summary-card">
                                <div className="admin-summary-top">
                                    <div className="admin-summary-icon admin-status-normal">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <span className="admin-status-pill admin-status-normal">
                                        roles
                                    </span>
                                </div>
                                <p className="admin-summary-label">Role Policies</p>
                                <h3 className="admin-summary-value">{rolePolicies.length}</h3>
                                <p className="admin-summary-meta">
                                    Super Admin, Lab Assistant, Maintenance, and Viewer are defined.
                                </p>
                            </article>
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel admin-management-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Manage Lab Users</h2>
                                        <p>Simple user table with view, edit, role assignment, and suspend actions.</p>
                                    </div>
                                    <Users size={20} />
                                </div>

                                <div className="admin-table-wrap admin-user-table-wrap">
                                    <table className="admin-table admin-user-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((row) => {
                                                const isSuperAdmin = row.role === "SUPER_ADMIN";
                                                const isExpanded = selectedUser?.id === row.id;
                                                const isEditing = isExpanded && selectedUser?.mode === "edit";

                                                return (
                                                    <Fragment key={row.id}>
                                                        <tr>
                                                            <td>
                                                                <div className="admin-user-cell">
                                                                    <strong>{row.name}</strong>
                                                                    <span>{row.email}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="admin-role-cell">
                                                                    <span className={isSuperAdmin ? "admin-role-lock" : "admin-role-badge"}>
                                                                        {roleLabels[row.role]}
                                                                    </span>
                                                                    <span className={`admin-status-pill ${getStatusClass(row.status)}`}>
                                                                        {row.status}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="admin-actions-cell">
                                                                    <button
                                                                        type="button"
                                                                        className="admin-icon-btn"
                                                                        title="View user"
                                                                        aria-label="View user"
                                                                        onClick={() =>
                                                                            setSelectedUser((current) =>
                                                                                current?.id === row.id && current.mode === "view"
                                                                                    ? null
                                                                                    : { id: row.id, mode: "view" },
                                                                            )
                                                                        }
                                                                    >
                                                                        <Eye size={15} />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="admin-icon-btn"
                                                                        title="Edit user"
                                                                        aria-label="Edit user"
                                                                        disabled={isSuperAdmin}
                                                                        onClick={() =>
                                                                            setSelectedUser((current) =>
                                                                                current?.id === row.id && current.mode === "edit"
                                                                                    ? null
                                                                                    : { id: row.id, mode: "edit" },
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil size={15} />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="admin-icon-btn"
                                                                        title={row.status === "Suspended" ? "Activate user" : "Suspend user"}
                                                                        aria-label={row.status === "Suspended" ? "Activate user" : "Suspend user"}
                                                                        disabled={isSuperAdmin}
                                                                        onClick={() => toggleUserSuspension(row.id)}
                                                                    >
                                                                        {row.status === "Suspended" ? <Check size={15} /> : <Pause size={15} />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {isExpanded && (
                                                            <tr className="admin-user-detail-row">
                                                                <td colSpan={3}>
                                                                    {isEditing ? (
                                                                        <div className="admin-user-edit-grid">
                                                                            <label className="admin-field">
                                                                                Name
                                                                                <input
                                                                                    value={row.name}
                                                                                    onChange={(event) =>
                                                                                        updateUser(row.id, "name", event.target.value)
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-field">
                                                                                Email
                                                                                <input
                                                                                    type="email"
                                                                                    value={row.email}
                                                                                    onChange={(event) =>
                                                                                        updateUser(row.id, "email", event.target.value)
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-field">
                                                                                Phone
                                                                                <input
                                                                                    value={row.phone}
                                                                                    onChange={(event) =>
                                                                                        updateUser(row.id, "phone", event.target.value)
                                                                                    }
                                                                                />
                                                                            </label>

                                                                            <label className="admin-field">
                                                                                Assign role
                                                                                <select
                                                                                    value={row.role}
                                                                                    onChange={(event) =>
                                                                                        updateUser(row.id, "role", event.target.value)
                                                                                    }
                                                                                >
                                                                                    {assignableRoles.map((roleOption) => (
                                                                                        <option key={roleOption} value={roleOption}>
                                                                                            {roleLabels[roleOption]}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </label>

                                                                            <label className="admin-field">
                                                                                Status
                                                                                <select
                                                                                    value={row.status}
                                                                                    onChange={(event) =>
                                                                                        updateUser(row.id, "status", event.target.value)
                                                                                    }
                                                                                >
                                                                                    <option>Active</option>
                                                                                    <option>Pending</option>
                                                                                    <option>Suspended</option>
                                                                                </select>
                                                                            </label>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="admin-user-detail">
                                                                            <div>
                                                                                <span>Email</span>
                                                                                <strong>{row.email}</strong>
                                                                            </div>
                                                                            <div>
                                                                                <span>Phone</span>
                                                                                <strong>{row.phone}</strong>
                                                                            </div>
                                                                            <div>
                                                                                <span>Role</span>
                                                                                <strong>{roleLabels[row.role]}</strong>
                                                                            </div>
                                                                            <div>
                                                                                <span>Status</span>
                                                                                <strong>{row.status}</strong>
                                                                            </div>
                                                                            <div>
                                                                                <span>Last login</span>
                                                                                <strong>{row.lastLogin}</strong>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Add User</h2>
                                        <p>Create a user account structure for later backend integration.</p>
                                    </div>
                                    <UserCog size={20} />
                                </div>

                                <form className="admin-user-form" onSubmit={addUser}>
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
                                        Phone
                                        <input
                                            value={newUser.phone}
                                            onChange={(event) =>
                                                setNewUser((prev) => ({
                                                    ...prev,
                                                    phone: event.target.value,
                                                }))
                                            }
                                            placeholder="+60 ..."
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
                                            {assignableRoles.map((roleOption) => (
                                                <option key={roleOption} value={roleOption}>
                                                    {roleLabels[roleOption]}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <button className="admin-primary-btn" type="submit">
                                        Add User
                                    </button>
                                </form>
                            </section>
                        </div>

                        <div className="admin-grid admin-grid-balanced">
                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Role and Permission Management</h2>
                                        <p>Select a role to inspect what it can access.</p>
                                    </div>
                                    <ShieldCheck size={20} />
                                </div>

                                <div className="admin-role-tabs">
                                    {rolePolicies.map((policy) => (
                                        <button
                                            key={policy.role}
                                            type="button"
                                            className={`admin-role-tab ${selectedRole.role === policy.role ? "active" : ""}`}
                                            onClick={() => setSelectedRole(policy)}
                                        >
                                            {policy.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="admin-role-detail">
                                    <div className="admin-task-top">
                                        <div>
                                            <h3>{selectedRole.label}</h3>
                                            <p>{selectedRole.description}</p>
                                        </div>
                                        <span className={`admin-status-pill ${getStatusClass(selectedRole.status)}`}>
                                            {selectedRole.status}
                                        </span>
                                    </div>

                                    <div className="admin-permission-list">
                                        {selectedRole.permissions.map((permission) => (
                                            <div key={permission} className="admin-permission-item">
                                                <span />
                                                {getPermissionLabel(permission)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="admin-panel">
                                <div className="admin-panel-header">
                                    <div>
                                        <h2>Permission Matrix</h2>
                                        <p>Frontend-only permission map prepared for backend RBAC later.</p>
                                    </div>
                                    <UserCog size={20} />
                                </div>

                                <div className="admin-perm-table-wrap">
                                    <table className="admin-perm-table">
                                        <thead>
                                            <tr>
                                                <th>Permission</th>
                                                {rolePolicies.map((policy) => (
                                                    <th key={policy.role}>{policy.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permissionDefinitions.map((permission) => (
                                                <tr key={permission.key}>
                                                    <td className="admin-perm-label" title={permission.description}>
                                                        {permission.label}
                                                    </td>
                                                    {rolePolicies.map((policy) => (
                                                        <td key={`${permission.key}-${policy.role}`} className="admin-perm-cell">
                                                            {policy.permissions.includes(permission.key)
                                                                ? <span className="admin-perm-yes" aria-label="Allowed">✓</span>
                                                                : <span className="admin-perm-no" aria-label="Denied">–</span>
                                                            }
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

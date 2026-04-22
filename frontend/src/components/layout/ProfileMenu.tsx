import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileMenu() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="profile-menu-wrapper">
            <button
                className="profile-avatar-btn"
                type="button"
                onClick={() => setOpen((prev) => !prev)}
            >
                <img
                    src="https://i.pravatar.cc/100?img=12"
                    alt="User profile"
                    className="profile-avatar"
                />
                <span className={`profile-caret ${open ? "open" : ""}`}>
                    ⌄
                </span>
            </button>

            {open && (
                <div className="profile-dropdown">
                    <button
                        className="profile-dropdown-item"
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate("/settings");
                        }}
                    >
                        Settings
                    </button>

                    <button
                        className="profile-dropdown-item danger"
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            navigate("/login"); // or your logout logic later
                        }}
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}
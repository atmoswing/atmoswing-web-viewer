import React from 'react';

export function SidebarWorkspaceDropdown({options = [], value, onChange, label}) {
    return (
        <div>
            <select
                className="sidebar-dropdown-input"
                value={value}
                onChange={e => onChange(e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
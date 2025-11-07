import {useState} from 'react';

export default function Panel({title, children, defaultOpen = false}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={`panel ${open ? 'open' : 'closed'}`}>
            <div className="panel-header" onClick={() => setOpen(o => !o)}>
                {title}
            </div>
            {open && <div className="panel-content" style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>{children}</div>}
        </div>
    );
}
import {useState} from 'react';

export default function Panel({title, children}) {
    const [open, setOpen] = useState(true);

    return (
        <div className={`panel ${open ? 'open' : 'closed'}`}>
            <div className="panel-header" onClick={() => setOpen(o => !o)}>
                {title}
            </div>
            {open && <div className="panel-content">{children}</div>}
        </div>
    );
}
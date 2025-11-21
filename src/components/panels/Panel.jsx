/**
 * @module components/panels/Panel
 * @description Collapsible panel component for sidebar sections.
 */

import {useState} from 'react';

/**
 * Collapsible panel with toggle header.
 *
 * @param {Object} props
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 * @param {boolean} [props.defaultOpen=false] - Initial open state
 * @returns {React.ReactElement}
 */
export default function Panel({title, children, defaultOpen = false}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`panel ${open ? 'open' : 'closed'}`}>
      <div className="panel-header" onClick={() => setOpen(o => !o)}>
        {title}
      </div>
      {open && <div className="panel-content"
                    style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>{children}</div>}
    </div>
  );
}

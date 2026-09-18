/**
 * @module components/panels/Panel
 * @description Collapsible panel component for sidebar sections.
 */

import {useId, useState} from 'react';

import '@/styles/panel.css';

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
  const contentId = useId();

  return (
    <div className={`panel ${open ? 'open' : 'closed'}`}>
      {/* A real button, so it can be focused and toggled with Enter or Space, and assistive
          technology announces whether the panel is expanded. */}
      <button
        type="button"
        className="panel-header"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen(o => !o)}
      >
        {title}
      </button>
      {open && <div id={contentId} className="panel-content"
                    style={{display: 'flex', flexDirection: 'column', minHeight: 0}}>{children}</div>}
    </div>
  );
}

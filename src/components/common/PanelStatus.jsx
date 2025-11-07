import React from 'react';

/**
 * Standardized status text inside a Panel: loading, error, empty, or custom.
 * Props: { loading, error, empty, messages: { loading?, error?, empty? } }
 */
export default function PanelStatus({ loading, error, empty, messages }) {
    const { loading: mLoading = 'Loading…', error: mError = 'Error loading', empty: mEmpty = 'No data' } = messages || {};
    let text = null;
    if (loading) text = mLoading;
    else if (error) text = mError;
    else if (empty) text = mEmpty;
    if (!text) return null;
    return <span className="panel-secondary-text">{text}</span>;
}


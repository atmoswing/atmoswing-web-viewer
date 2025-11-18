/**
 * @module components/panels/PanelStatus
 * @description Standardized status text renderer inside a Panel for loading/error/empty states.
 */

import React from 'react';

/**
 * Renders a small status line based on loading/error/empty flags.
 * Priority order: loading > error > empty.
 * Returns null if none are true.
 * @param {Object} props
 * @param {boolean} [props.loading] - Whether the panel content is loading
 * @param {boolean} [props.error] - Whether an error occurred
 * @param {boolean} [props.empty] - Whether there is no data to show
 * @param {Object} [props.messages] - Optional custom messages
 * @param {string} [props.messages.loading] - Loading message override
 * @param {string} [props.messages.error] - Error message override
 * @param {string} [props.messages.empty] - Empty message override
 * @returns {React.ReactElement|null} Span element or null if no status
 */
export default function PanelStatus({loading, error, empty, messages}) {
  const {loading: mLoading = 'Loading…', error: mError = 'Error loading', empty: mEmpty = 'No data'} = messages || {};
  let text = null;
  if (loading) text = mLoading;
  else if (error) text = mError;
  else if (empty) text = mEmpty;
  if (!text) return null;
  return <span className="panel-secondary-text">{text}</span>;
}

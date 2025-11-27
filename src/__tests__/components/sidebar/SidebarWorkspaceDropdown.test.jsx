/**
 * @fileoverview Smoke tests for SidebarWorkspaceDropdown component
 */

// Call i18n setup early
import { setupI18nMock } from '../../testUtils.js';
setupI18nMock();

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {SidebarWorkspaceDropdown} from '@/components/sidebar/SidebarWorkspaceDropdown.jsx';

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({
  useWorkspace: vi.fn(() => ({
    workspace: 'workspace1',
    setWorkspace: vi.fn()
  }))
}));

describe('SidebarWorkspaceDropdown', () => {
  const mockOptions = [
    {key: 'workspace1', name: 'Workspace 1'},
    {key: 'workspace2', name: 'Workspace 2'}
  ];

  it('renders without crashing', () => {
    render(<SidebarWorkspaceDropdown options={mockOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with empty options', () => {
    render(<SidebarWorkspaceDropdown options={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles single workspace option', () => {
    const singleOption = [{key: 'only', name: 'Only Workspace'}];
    render(<SidebarWorkspaceDropdown options={singleOption} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

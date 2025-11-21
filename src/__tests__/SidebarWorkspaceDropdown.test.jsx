/**
 * @fileoverview Smoke tests for Sidebar sub-components
 */

import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SidebarWorkspaceDropdown} from '@/components/sidebar/SidebarWorkspaceDropdown.jsx';

vi.mock('@/contexts/WorkspaceContext.jsx', () => ({
  useWorkspace: vi.fn(() => ({
    workspace: 'workspace1',
    setWorkspace: vi.fn()
  }))
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key
  })
}));

describe('SidebarWorkspaceDropdown', () => {
  const mockOptions = [
    {key: 'workspace1', name: 'Workspace 1'},
    {key: 'workspace2', name: 'Workspace 2'},
    {key: 'workspace3', name: 'Workspace 3'}
  ];

  it('renders without crashing', () => {
    render(<SidebarWorkspaceDropdown options={mockOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with empty options', () => {
    render(<SidebarWorkspaceDropdown options={[]} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays current workspace', () => {
    render(<SidebarWorkspaceDropdown options={mockOptions} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('workspace1');
  });

  it('renders all workspace options', async () => {
    const user = userEvent.setup();
    render(<SidebarWorkspaceDropdown options={mockOptions} />);

    const select = screen.getByRole('combobox');
    await user.click(select);

    expect(screen.getByText('Workspace 1')).toBeInTheDocument();
    expect(screen.getByText('Workspace 2')).toBeInTheDocument();
    expect(screen.getByText('Workspace 3')).toBeInTheDocument();
  });

  it('handles workspace selection', async () => {
    const {useWorkspace} = require('@/contexts/WorkspaceContext.jsx');
    const mockSetWorkspace = vi.fn();
    useWorkspace.mockReturnValue({
      workspace: 'workspace1',
      setWorkspace: mockSetWorkspace
    });

    const user = userEvent.setup();
    render(<SidebarWorkspaceDropdown options={mockOptions} />);

    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText('Workspace 2'));

    expect(mockSetWorkspace).toHaveBeenCalledWith('workspace2');
  });

  it('handles single workspace option', () => {
    const singleOption = [{key: 'only', name: 'Only Workspace'}];
    render(<SidebarWorkspaceDropdown options={singleOption} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});


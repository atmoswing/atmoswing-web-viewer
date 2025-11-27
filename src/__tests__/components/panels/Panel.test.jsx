/**
 * @fileoverview Smoke tests for Panel component
 */

import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Panel from '@/components/panels/Panel.jsx';

describe('Panel', () => {
  it('renders without crashing', () => {
    render(<Panel title="Test Panel">Content</Panel>);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('displays panel title', () => {
    render(<Panel title="My Panel">Content</Panel>);
    expect(screen.getByText('My Panel')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(<Panel title="Test Panel">Panel Content</Panel>);
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
  });

  it('can be opened by default with defaultOpen prop', () => {
    render(<Panel title="Test Panel" defaultOpen={true}>Panel Content</Panel>);
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('toggles content when header is clicked', async () => {
    const user = userEvent.setup();
    render(<Panel title="Test Panel">Panel Content</Panel>);

    // Initially closed
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();

    // Click to open
    await user.click(screen.getByText('Test Panel'));
    expect(screen.getByText('Panel Content')).toBeInTheDocument();

    // Click to close
    await user.click(screen.getByText('Test Panel'));
    expect(screen.queryByText('Panel Content')).not.toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <Panel title="Test Panel" defaultOpen={true}>
        <div data-testid="child-content">Child Element</div>
      </Panel>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('applies correct CSS classes when closed', () => {
    const {container} = render(<Panel title="Test Panel">Content</Panel>);
    const panelDiv = container.querySelector('.panel');
    expect(panelDiv).toHaveClass('closed');
    expect(panelDiv).not.toHaveClass('open');
  });

  it('applies correct CSS classes when open', () => {
    const {container} = render(<Panel title="Test Panel" defaultOpen={true}>Content</Panel>);
    const panelDiv = container.querySelector('.panel');
    expect(panelDiv).toHaveClass('open');
    expect(panelDiv).not.toHaveClass('closed');
  });

  it('maintains state across re-renders', async () => {
    const user = userEvent.setup();
    const {rerender} = render(<Panel title="Test Panel">Content</Panel>);

    // Open the panel
    await user.click(screen.getByText('Test Panel'));
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Re-render with same props
    rerender(<Panel title="Test Panel">Content</Panel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders complex children', () => {
    render(
      <Panel title="Test Panel" defaultOpen={true}>
        <div>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <button>Click me</button>
        </div>
      </Panel>
    );
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Click me'})).toBeInTheDocument();
  });
});


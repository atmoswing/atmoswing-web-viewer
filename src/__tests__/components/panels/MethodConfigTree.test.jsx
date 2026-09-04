/**
 * @fileoverview Tests for the method/configuration selection tree.
 *
 * Tree item ids encode the selection as `methodId` or `methodId:configId`, so the parsing
 * and the reverse derivation of `selectedItems` are what these cover.
 */

import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MethodConfigTree from '@/components/panels/MethodConfigTree.jsx';

const TREE = [
  {id: 'm1', name: 'Method one', children: [{id: 'c1', name: 'Config one'}, {id: 'c2', name: 'Config two'}]},
  {id: 'm2', name: 'Method two', children: []}
];

function renderTree(props = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <MethodConfigTree
      methodConfigTree={TREE}
      selectedMethodConfig={null}
      onSelect={onSelect}
      {...props}
    />
  );
  return {onSelect, ...utils};
}

describe('MethodConfigTree', () => {
  it('lists every method', () => {
    renderTree();
    expect(screen.getByText('Method one')).toBeInTheDocument();
    expect(screen.getByText('Method two')).toBeInTheDocument();
  });

  it('reports a method selection with no configuration', async () => {
    const user = userEvent.setup();
    const {onSelect} = renderTree();

    await user.click(screen.getByText('Method one'));

    expect(onSelect).toHaveBeenCalledWith({method: TREE[0], config: null});
  });

  it('reports a configuration selection with both parts', async () => {
    const user = userEvent.setup();
    const {onSelect, container} = renderTree({
      selectedMethodConfig: {method: TREE[0], config: null}
    });

    // Children render only once expanded, and the tree expands from the icon, not the label.
    await user.click(container.querySelector('.MuiTreeItem-iconContainer'));
    await user.click(screen.getByText('Config two'));

    expect(onSelect).toHaveBeenCalledWith({method: TREE[0], config: TREE[0].children[1]});
  });

  it('marks the method as selected when no configuration is chosen', () => {
    const {container} = renderTree({selectedMethodConfig: {method: TREE[0], config: null}});
    expect(container.querySelectorAll('.Mui-selected').length).toBeGreaterThan(0);
    expect(screen.getByText('Method one')).toBeInTheDocument();
  });

  it('marks the chosen configuration as selected once its method is expanded', async () => {
    const user = userEvent.setup();
    const {container} = renderTree({
      selectedMethodConfig: {method: TREE[0], config: TREE[0].children[0]}
    });

    await user.click(container.querySelector('.MuiTreeItem-iconContainer'));

    const selected = container.querySelectorAll('.Mui-selected');
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain('Config one');
  });

  it('selects nothing when there is no selection', () => {
    const {container} = renderTree({selectedMethodConfig: null});
    expect(container.querySelectorAll('.Mui-selected')).toHaveLength(0);
  });

  it('renders a method with no configurations', () => {
    renderTree();
    expect(screen.getByText('Method two')).toBeInTheDocument();
  });

  it('renders an empty tree without crashing', () => {
    expect(() => renderTree({methodConfigTree: []})).not.toThrow();
  });
});

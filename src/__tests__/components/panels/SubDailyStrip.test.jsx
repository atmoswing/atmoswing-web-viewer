/**
 * @fileoverview Tests for the sub-daily segment strip of the synthesis grid.
 */

import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render} from '@testing-library/react';

import SubDailyStrip from '@/components/panels/SubDailyStrip.jsx';
import {SUB_HOURS} from '@/utils/targetDateUtils.js';

const DAY = new Date(2025, 10, 5);

/** Builds a segment map covering the given hours. */
function segments(hours, valueNorm = 0.5) {
  return new Map(hours.map(h => [h, {date: new Date(2025, 10, 5, h), valueNorm}]));
}

function renderStrip(props = {}) {
  const onSelect = vi.fn();
  const {container} = render(
    <SubDailyStrip
      segmentsByHour={segments(SUB_HOURS)}
      methodLabel="Method A"
      onSelect={onSelect}
      selectedDate={null}
      isMethodSelected={false}
      {...props}
    />
  );
  return {onSelect, container};
}

const segmentsOf = container => container.querySelectorAll('.alarm-sub-seg');
const placeholdersOf = container => container.querySelectorAll('.alarm-sub-seg.placeholder');

describe('SubDailyStrip', () => {
  it('renders one segment per sub-daily hour', () => {
    const {container} = renderStrip();
    expect(segmentsOf(container)).toHaveLength(SUB_HOURS.length);
    expect(placeholdersOf(container)).toHaveLength(0);
  });

  it('renders a placeholder for hours with no data, keeping the day full width', () => {
    // A partially covered day must still occupy the same width, or the grid columns
    // stop lining up across methods.
    const {container} = renderStrip({segmentsByHour: segments([0, 12])});
    expect(segmentsOf(container)).toHaveLength(SUB_HOURS.length);
    expect(placeholdersOf(container)).toHaveLength(2);
  });

  it('labels each segment with the method and its timestamp', () => {
    const {container} = renderStrip({segmentsByHour: segments([6])});
    const withTitle = [...segmentsOf(container)].find(el => el.getAttribute('title'));
    expect(withTitle.getAttribute('title')).toContain('Method A');
  });

  it('reports the clicked segment date', () => {
    const {onSelect, container} = renderStrip({segmentsByHour: segments([6])});

    fireEvent.click([...segmentsOf(container)].find(el => !el.classList.contains('placeholder')));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].getHours()).toBe(6);
  });

  it('does not let a segment click reach the day cell underneath', () => {
    const onParentClick = vi.fn();
    const onSelect = vi.fn();
    const {container} = render(
      <div onClick={onParentClick}>
        <SubDailyStrip
          segmentsByHour={segments([6])}
          methodLabel="Method A"
          onSelect={onSelect}
          selectedDate={null}
          isMethodSelected={false}
        />
      </div>
    );

    fireEvent.click([...segmentsOf(container)].find(el => !el.classList.contains('placeholder')));

    expect(onSelect).toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('ignores clicks on a placeholder', () => {
    const {onSelect, container} = renderStrip({segmentsByHour: segments([0])});

    fireEvent.click(placeholdersOf(container)[0]);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('survives a missing onSelect', () => {
    const {container} = render(
      <SubDailyStrip
        segmentsByHour={segments([6])}
        methodLabel="Method A"
        selectedDate={null}
        isMethodSelected={false}
      />
    );
    expect(() => fireEvent.click(segmentsOf(container)[0])).not.toThrow();
  });

  it('marks the selected segment only when this method is the selected one', () => {
    const selectedDate = new Date(2025, 10, 5, 6);
    const props = {segmentsByHour: segments([6]), selectedDate};

    const selected = render(<SubDailyStrip {...props} methodLabel="A" onSelect={vi.fn()} isMethodSelected/>);
    expect(selected.container.querySelectorAll('.alarm-sub-seg > div')).toHaveLength(1);

    const other = render(
      <SubDailyStrip {...props} methodLabel="A" onSelect={vi.fn()} isMethodSelected={false}/>
    );
    expect(other.container.querySelectorAll('.alarm-sub-seg > div')).toHaveLength(0);
  });

  it('marks nothing when the selected date is another hour', () => {
    const {container} = renderStrip({
      segmentsByHour: segments([6]),
      selectedDate: new Date(2025, 10, 5, 12),
      isMethodSelected: true
    });
    expect(container.querySelectorAll('.alarm-sub-seg > div')).toHaveLength(0);
  });

  it('handles a segment with no numeric value', () => {
    const byHour = new Map([[6, {date: DAY, valueNorm: null}]]);
    expect(() => renderStrip({segmentsByHour: byHour})).not.toThrow();
  });
});

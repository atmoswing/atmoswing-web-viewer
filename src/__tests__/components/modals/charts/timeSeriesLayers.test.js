/**
 * @fileoverview Tests for the time series chart's date picker layer: the hover guide and the click
 * that picks the nearest target date.
 */

import {describe, expect, it, vi} from 'vitest';
import * as d3 from 'd3';

import {drawDatePicker} from '@/components/modals/charts/draw/timeSeriesLayers.js';

const DATES = [new Date(2024, 0, 1), new Date(2024, 0, 2), new Date(2024, 0, 3)];
const INNER_W = 200;
const INNER_H = 100;

/** A plot group in a fresh SVG, with one existing layer, and a time scale over the dates. */
function setup() {
  const svg = d3.select(document.body).append('svg');
  const plotG = svg.append('g');
  plotG.append('path').attr('class', 'band');
  const xScale = d3.scaleTime().domain([DATES[0], DATES[2]]).range([0, INNER_W]);
  return {svg, plotG, xScale};
}

// jsdom lays nothing out, so d3.pointer measures from the origin: clientX is the plot x.
const fire = (node, type, clientX = 0) =>
  node.dispatchEvent(new MouseEvent(type, {bubbles: true, clientX}));

describe('drawDatePicker', () => {
  it('draws nothing without dates or a pick handler', () => {
    const {svg, plotG, xScale} = setup();
    drawDatePicker(plotG, {dates: [], xScale, innerW: INNER_W, innerH: INNER_H, labelFor: String, onPick: vi.fn()});
    drawDatePicker(plotG, {dates: DATES, xScale, innerW: INNER_W, innerH: INNER_H, labelFor: String});
    expect(plotG.select('.date-picker-area').empty()).toBe(true);
    svg.remove();
  });

  it('catches the pointer under every other layer, and draws the guide on top', () => {
    const {svg, plotG, xScale} = setup();
    drawDatePicker(plotG, {dates: DATES, xScale, innerW: INNER_W, innerH: INNER_H, labelFor: String, onPick: vi.fn()});

    const children = plotG.node().children;
    expect(children[0].getAttribute('class')).toBe('date-picker-area');
    expect(children[children.length - 1].getAttribute('class')).toBe('date-picker-guide');
    expect(plotG.select('.date-picker-guide').attr('pointer-events')).toBe('none');
    svg.remove();
  });

  it('shows the guide on the nearest date while hovering, and hides it on leaving', () => {
    const {svg, plotG, xScale} = setup();
    const labelFor = d => `details ${d.getDate()}`;
    drawDatePicker(plotG, {dates: DATES, xScale, innerW: INNER_W, innerH: INNER_H, labelFor, onPick: vi.fn()});
    const guide = plotG.select('.date-picker-guide');

    fire(plotG.select('.band').node(), 'mousemove', 130); // nearer 2 January (x = 100) than 3 January
    expect(guide.style('display')).not.toBe('none');
    expect(guide.select('line').attr('x1')).toBe('100');
    expect(guide.select('text').text()).toBe('details 2');

    fire(plotG.node(), 'mouseleave');
    expect(guide.style('display')).toBe('none');
    svg.remove();
  });

  it('keeps the label inside the plot on the right half', () => {
    const {svg, plotG, xScale} = setup();
    drawDatePicker(plotG, {dates: DATES, xScale, innerW: INNER_W, innerH: INNER_H, labelFor: String, onPick: vi.fn()});

    fire(plotG.node(), 'mousemove', 190);
    const label = plotG.select('.date-picker-guide text');
    expect(label.attr('text-anchor')).toBe('end');
    expect(Number(label.attr('x'))).toBeLessThan(INNER_W);
    svg.remove();
  });

  it('picks the nearest date on click, from any layer', () => {
    const {svg, plotG, xScale} = setup();
    const onPick = vi.fn();
    drawDatePicker(plotG, {dates: DATES, xScale, innerW: INNER_W, innerH: INNER_H, labelFor: String, onPick});

    fire(plotG.select('.band').node(), 'click', 20);
    fire(plotG.select('.date-picker-area').node(), 'click', 180);

    expect(onPick.mock.calls.map(([d]) => d.getDate())).toEqual([1, 3]);
    svg.remove();
  });
});

import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {setupI18nMock} from '../../testUtils.js';
import ExportMenu from '@/components/modals/common/ExportMenu.jsx';

const {enqueueSnackbar} = vi.hoisted(() => ({enqueueSnackbar: vi.fn()}));
// ExportMenu reads the snackbar context directly, and useSnackbar throws outside a
// provider, so every render here goes through this mock.
vi.mock('@/contexts/SnackbarContext.jsx', () => ({
  useSnackbar: () => ({enqueueSnackbar})
}));

setupI18nMock();

describe('ExportMenu', () => {
  const onPNG = vi.fn();
  const onSVG = vi.fn();
  const onPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with translation key', async () => {
    render(<ExportMenu t={(k) => k} onExportPNG={onPNG} onExportSVG={onSVG} onExportPDF={onPDF}/>);
    expect(screen.getByText('seriesModal.export')).toBeInTheDocument();
  });

  // Three MUI portal open/close cycles driven by userEvent: fast in isolation (~1s) but
  // slow enough under coverage instrumentation to overrun the 5s default.
  it('opens menu and triggers export handlers', async () => {
    const user = userEvent.setup();
    render(<ExportMenu t={(k) => k} onExportPNG={onPNG} onExportSVG={onSVG} onExportPDF={onPDF}/>);
    const btn = screen.getByText('seriesModal.export');
    await user.click(btn);

    // Menu items should be present (MUI Menu renders in a portal, so await)
    const png = await screen.findByText('PNG');
    const svg = await screen.findByText('SVG');
    const pdf = await screen.findByText('PDF');
    expect(png).toBeInTheDocument();
    expect(svg).toBeInTheDocument();
    expect(pdf).toBeInTheDocument();

    await user.click(png);
    expect(onPNG).toHaveBeenCalled();

    // Reopen and click SVG
    await user.click(btn);
    const svg2 = await screen.findByText('SVG');
    await user.click(svg2);
    expect(onSVG).toHaveBeenCalled();

    // Reopen and click PDF
    await user.click(btn);
    const pdf2 = await screen.findByText('PDF');
    await user.click(pdf2);
    expect(onPDF).toHaveBeenCalled();
  }, 20000);

  it('shows a snackbar when an export rejects', async () => {
    const user = userEvent.setup();
    const failing = vi.fn().mockRejectedValue(new Error('render failed'));
    render(<ExportMenu t={(k) => k} onExportPNG={failing} onExportSVG={onSVG} onExportPDF={onPDF}/>);

    await user.click(screen.getByText('seriesModal.export'));
    await user.click(await screen.findByText('PNG'));

    expect(failing).toHaveBeenCalled();
    expect(enqueueSnackbar).toHaveBeenCalledWith(
      'seriesModal.exportFailed',
      {variant: 'error'}
    );
  }, 20000);

  it('does not show a snackbar when an export succeeds', async () => {
    const user = userEvent.setup();
    render(<ExportMenu t={(k) => k} onExportPNG={onPNG} onExportSVG={onSVG} onExportPDF={onPDF}/>);

    await user.click(screen.getByText('seriesModal.export'));
    await user.click(await screen.findByText('PNG'));

    expect(onPNG).toHaveBeenCalled();
    expect(enqueueSnackbar).not.toHaveBeenCalled();
  }, 20000);
});

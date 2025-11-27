import React from 'react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k, i18n: { language: 'en' } }) }));

import ExportMenu from '@/components/modals/common/ExportMenu.jsx';

describe('ExportMenu', () => {
  const onPNG = vi.fn();
  const onSVG = vi.fn();
  const onPDF = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with translation key', async () => {
    render(<ExportMenu t={(k) => k} onExportPNG={onPNG} onExportSVG={onSVG} onExportPDF={onPDF} />);
    expect(screen.getByText('seriesModal.export')).toBeInTheDocument();
  });

  it('opens menu and triggers export handlers', async () => {
    const user = userEvent.setup();
    render(<ExportMenu t={(k) => k} onExportPNG={onPNG} onExportSVG={onSVG} onExportPDF={onPDF} />);
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
  });
});

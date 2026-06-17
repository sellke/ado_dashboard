import { addChartUnavailablePlaceholder, addEmptyDataPanel } from '@/lib/export/placeholders';

function makeMockSlide() {
  return { addText: jest.fn(), addShape: jest.fn() };
}

describe('export placeholders', () => {
  it('addChartUnavailablePlaceholder renders title and optional detail', () => {
    const slide = makeMockSlide();
    addChartUnavailablePlaceholder(slide as never, {
      x: 1,
      y: 2,
      w: 4,
      h: 3,
      detail: 'Capture failed',
    });
    const text = slide.addText.mock.calls.map((c) => String(c[0]));
    expect(text).toContain('Chart unavailable');
    expect(text).toContain('Capture failed');
    expect(slide.addShape).toHaveBeenCalled();
  });

  it('addEmptyDataPanel renders centered message', () => {
    const slide = makeMockSlide();
    addEmptyDataPanel(slide as never, 'No trend data for this scope.', { y: 2 });
    expect(slide.addText).toHaveBeenCalledWith(
      'No trend data for this scope.',
      expect.objectContaining({ align: 'center' })
    );
  });
});

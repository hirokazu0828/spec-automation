import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteSelector from './RouteSelector';

describe('RouteSelector', () => {
  it('renders three route cards (A/B/C)', () => {
    render(
      <RouteSelector
        onPickRouteA={() => {}}
        onPickRouteB={() => {}}
        onPickRouteC={() => {}}
      />,
    );
    expect(screen.getByText('サンプル帳から作成')).toBeInTheDocument();
    expect(screen.getByText('既存ドラフトを複製')).toBeInTheDocument();
    expect(screen.getByText('コンセプトから作成')).toBeInTheDocument();
  });

  it('Route A click fires the simple callback', async () => {
    const onA = vi.fn();
    const user = userEvent.setup();
    render(<RouteSelector onPickRouteA={onA} onPickRouteB={() => {}} onPickRouteC={() => {}} />);
    await user.click(screen.getByText('サンプル帳から作成'));
    expect(onA).toHaveBeenCalledTimes(1);
  });

  it('Route B disable hides the click and shows the hint', async () => {
    const onB = vi.fn();
    const user = userEvent.setup();
    render(
      <RouteSelector
        onPickRouteA={() => {}}
        onPickRouteB={onB}
        onPickRouteC={() => {}}
        disableRouteB
      />,
    );
    expect(screen.getByText('まだドラフトがありません')).toBeInTheDocument();
    await user.click(screen.getByText('既存ドラフトを複製'));
    expect(onB).not.toHaveBeenCalled();
  });

  it('Route C defaults to sample and forwards the selection on submit', async () => {
    const onC = vi.fn();
    const user = userEvent.setup();
    render(<RouteSelector onPickRouteA={() => {}} onPickRouteB={() => {}} onPickRouteC={onC} />);
    expect((screen.getByLabelText('サンプル指示書') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('最終仕様書') as HTMLInputElement).checked).toBe(false);
    await user.click(screen.getByRole('button', { name: '作成' }));
    expect(onC).toHaveBeenCalledWith('sample');
  });

  it('Route C respects the radio change before submit', async () => {
    const onC = vi.fn();
    const user = userEvent.setup();
    render(<RouteSelector onPickRouteA={() => {}} onPickRouteB={() => {}} onPickRouteC={onC} />);
    await user.click(screen.getByLabelText('最終仕様書'));
    await user.click(screen.getByRole('button', { name: '作成' }));
    expect(onC).toHaveBeenCalledWith('final');
  });
});

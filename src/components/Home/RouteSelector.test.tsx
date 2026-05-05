import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RouteSelector from './RouteSelector';

describe('RouteSelector', () => {
  it('renders three route cards with A/B/C labels', () => {
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

  it('fires the right callback when each route is clicked', async () => {
    const onA = vi.fn();
    const onB = vi.fn();
    const onC = vi.fn();
    const user = userEvent.setup();
    render(<RouteSelector onPickRouteA={onA} onPickRouteB={onB} onPickRouteC={onC} />);
    await user.click(screen.getByText('サンプル帳から作成'));
    await user.click(screen.getByText('既存ドラフトを複製'));
    await user.click(screen.getByText('コンセプトから作成'));
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).toHaveBeenCalledTimes(1);
    expect(onC).toHaveBeenCalledTimes(1);
  });

  it('disables Route B and shows the hint when disableRouteB=true', async () => {
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
});

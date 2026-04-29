import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from './AuthGate';

describe('AuthGate', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows the password form when not authenticated', () => {
    render(
      <AuthGate>
        <div>secret content</div>
      </AuthGate>,
    );
    expect(screen.getByPlaceholderText('パスワード')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('rejects an incorrect password and surfaces an alert', async () => {
    const user = userEvent.setup();
    render(
      <AuthGate>
        <div>secret content</div>
      </AuthGate>,
    );
    await user.type(screen.getByPlaceholderText('パスワード'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '入室する' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('パスワードが正しくありません');
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('grants access on correct password', async () => {
    const user = userEvent.setup();
    render(
      <AuthGate>
        <div>secret content</div>
      </AuthGate>,
    );
    await user.type(screen.getByPlaceholderText('パスワード'), 'test-password');
    await user.click(screen.getByRole('button', { name: '入室する' }));

    expect(await screen.findByText('secret content')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('does not render when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Very weak" for a single rule matched', () => {
    render(<PasswordStrengthIndicator password="a" />);
    expect(screen.getByText('Very weak')).toBeInTheDocument();
  });

  it('renders "Weak" for two rules matched', () => {
    render(<PasswordStrengthIndicator password="aA" />);
    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('renders "Fair" for three rules matched', () => {
    render(<PasswordStrengthIndicator password="aA1" />);
    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('renders "Strong" for four rules matched', () => {
    render(<PasswordStrengthIndicator password="aA1!" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('renders "Very strong" for all rules matched', () => {
    render(<PasswordStrengthIndicator password="aA1!bcdef" />);
    expect(screen.getByText('Very strong')).toBeInTheDocument();
  });

  it('renders correct checks for each rule', () => {
    render(<PasswordStrengthIndicator password="aA1!" />);
    expect(screen.getByText('Uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('A number')).toBeInTheDocument();
    expect(screen.getByText('Special character (!@#$...)')).toBeInTheDocument();
    expect(screen.getByText('At least 6 characters')).toBeInTheDocument();
  });
});

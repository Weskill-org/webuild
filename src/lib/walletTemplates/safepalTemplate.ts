export const safepalTemplate = {
  name: 'SafePal',
  logo: 'https://www.safepal.io/logo.svg',
  color: '#FF6B35',
  darkColor: '#F7931A',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #FF6B35 0%, #F7931A 100%); color: #fff;">
      <h2>SafePal Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Portfolio</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Assets</p>
          <h3>{assets}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Hardware Wallet', 'Mobile Wallet', 'DeFi', 'Staking'],
};

export default safepalTemplate;

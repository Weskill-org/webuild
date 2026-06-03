export const bybitTemplate = {
  name: 'Bybit',
  logo: 'https://cdn.bybit.com/common/svg/logo.svg',
  color: '#F7931A',
  darkColor: '#FF6B00',
  theme: 'dark',
  layout: `
    <div style="background: linear-gradient(135deg, #000 0%, #1a1a1a 100%); color: #F7931A;">
      <h2>Bybit Trading Account</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Wallet Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Available</p>
          <h3>{available}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Derivatives', 'Spot', 'Options', 'Copy Trading'],
};

export default bybitTemplate;

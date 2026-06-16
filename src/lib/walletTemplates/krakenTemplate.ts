export const krakenTemplate = {
  name: 'Kraken',
  logo: 'https://www.kraken.com/img/kraken-k-logo.svg',
  color: '#6B21A8',
  darkColor: '#A855F7',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #6B21A8 0%, #A855F7 100%); color: #fff;">
      <h2>Kraken Pro</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Funding Account</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Trading Account</p>
          <h3>{trading}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Spot Trading', 'Futures', 'Staking', 'Crypto Loans'],
};

export default krakenTemplate;

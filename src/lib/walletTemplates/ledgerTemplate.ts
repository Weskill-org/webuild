export const ledgerTemplate = {
  name: 'Ledger',
  logo: 'https://www.ledger.com/logo.png',
  color: '#000000',
  darkColor: '#333333',
  theme: 'dark',
  layout: `
    <div style="background: linear-gradient(135deg, #000000 0%, #333333 100%); color: #fff;">
      <h2>Ledger Live</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Portfolio</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Accounts</p>
          <h3>{accounts}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Hardware Security', 'Multi-Asset', 'Staking', 'Token Manager'],
};

export default ledgerTemplate;

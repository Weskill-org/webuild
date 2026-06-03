export const tronlinkTemplate = {
  name: 'TronLink',
  logo: 'https://www.tronlink.org/logo.svg',
  color: '#EF0055',
  darkColor: '#FF1D42',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #EF0055 0%, #FF1D42 100%); color: #fff;">
      <h2>TronLink Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>TRX Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Energy</p>
          <h3>{energy}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['TRON Network', 'DApps', 'Voting', 'Resource Delegation'],
};

export default tronlinkTemplate;

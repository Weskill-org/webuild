export const trustwalletTemplate = {
  name: 'Trust Wallet',
  logo: 'https://trustwallet.com/assets/images/favicon-96x96.png',
  color: '#3375BB',
  darkColor: '#4A90E2',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #3375BB 0%, #4A90E2 100%); color: #fff;">
      <h2>Trust Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Total Value</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>24h Change</p>
          <h3>{change24h}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Multi-Chain', 'DEX Swap', 'Staking', 'NFTs'],
};

export default trustwalletTemplate;

export const phantomTemplate = {
  name: 'Phantom',
  logo: 'https://phantom.app/logo.svg',
  color: '#AB9FF2',
  darkColor: '#7C3AED',
  theme: 'dark',
  layout: `
    <div style="background: linear-gradient(135deg, #7C3AED 0%, #AB9FF2 100%); color: #fff;">
      <h2>Phantom Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>SOL Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Token Value</p>
          <h3>{tokenValue}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Solana', 'Ethereum', 'Polygon', 'Token Swap'],
};

export default phantomTemplate;

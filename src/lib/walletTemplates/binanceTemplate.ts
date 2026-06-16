export const binanceTemplate = {
  name: 'Binance',
  logo: 'https://bin.bnbstatic.com/image/fbc7946bcd1cda5eu01a122c32e47c18.png',
  color: '#F3BA2F',
  darkColor: '#ffd700',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #F3BA2F 0%, #FFD700 100%); color: #000;">
      <h2>Binance Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Total Value</p>
          <h3>{totalValue}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Spot Trading', 'Futures', 'Staking', 'NFT Marketplace'],
};

export default binanceTemplate;

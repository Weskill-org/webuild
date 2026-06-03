export const coinbaseTemplate = {
  name: 'Coinbase',
  logo: 'https://images.ctfassets.net/c5bd0wqzc91e/4R4VaCkUeIG0008880eSoW/c7fb126cd8e1d6b67881d35cec33195e/CB_Logomark_Blue.png',
  color: #1F2937',
  darkColor: '#4F46E5',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #1F2937 0%, #4F46E5 100%); color: #fff;">
      <h2>Coinbase Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Total Assets</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Portfolio Value</p>
          <h3>{portfolioValue}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Buy/Sell', 'Convert', 'Rewards', 'Staking'],
};

export default coinbaseTemplate;

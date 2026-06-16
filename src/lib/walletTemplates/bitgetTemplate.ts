export const bitgetTemplate = {
  name: 'Bitget',
  logo: 'https://www.bitget.com/favicon.ico',
  color: '#EEB902',
  darkColor: '#FFD700',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #EEB902 0%, #FFD700 100%); color: #000;">
      <h2>Bitget Trading</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Account Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Copy Trading</p>
          <h3>{copyTrading}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Spot Trading', 'Derivatives', 'Copy Trading', 'Grid Trading'],
};

export default bitgetTemplate;

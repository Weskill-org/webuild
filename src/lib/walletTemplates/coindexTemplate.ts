export const coindexTemplate = {
  name: 'Coindex',
  logo: 'https://coindex.io/logo.svg',
  color: '#6366F1',
  darkColor: '#818CF8',
  theme: 'dark',
  layout: `
    <div style="background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%); color: #fff;">
      <h2>Coindex Portfolio</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Net Worth</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Return</p>
          <h3>{return}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Portfolio Tracking', 'Analytics', 'Tax Reports', 'Alerts'],
};

export default coindexTemplate;

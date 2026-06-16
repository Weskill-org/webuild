export const exodusTemplate = {
  name: 'Exodus',
  logo: 'https://www.exodus.io/logo.svg',
  color: '#00D4FF',
  darkColor: '#0099CC',
  theme: 'dark',
  layout: `
    <div style="background: linear-gradient(135deg, #0099CC 0%, #00D4FF 100%); color: #000;">
      <h2>Exodus Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Total Holdings</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Exchange Rate</p>
          <h3>{rate}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Multi-Asset', 'Built-in Exchange', 'Desktop', 'Mobile'],
};

export default exodusTemplate;

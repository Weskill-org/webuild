export const metamaskTemplate = {
  name: 'MetaMask',
  logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
  color: '#F6851B',
  darkColor: '#FF6B35',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #F6851B 0%, #FF6B35 100%); color: #000;">
      <h2>MetaMask</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Account Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Gas Balance</p>
          <h3>{gas}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Ethereum', 'BSC', 'Polygon', 'Custom Networks'],
};

export default metamaskTemplate;

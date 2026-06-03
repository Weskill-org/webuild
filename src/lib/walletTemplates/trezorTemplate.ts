export const trezorTemplate = {
  name: 'Trezor',
  logo: 'https://trezor.io/static/images/favicon.svg',
  color: '#1BA366',
  darkColor: '#26D07C',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #1BA366 0%, #26D07C 100%); color: #fff;">
      <h2>Trezor Suite</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Total Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Pending</p>
          <h3>{pending}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['Hardware Wallet', 'Staking', 'NFT Gallery', 'Backup'],
};

export default trezorTemplate;

export const raydiumTemplate = {
  name: 'Raydium',
  logo: 'https://raydium.io/favicon.ico',
  color: #1DB17A',
  darkColor: '#20D9A3',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #1DB17A 0%, #20D9A3 100%); color: #fff;">
      <h2>Raydium AMM</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Your Liquidity</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>Earned Fees</p>
          <h3>{fees}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['AMM', 'Yield Farming', 'AcceleRaytor', 'Swap'],
};

export default raydiumTemplate;

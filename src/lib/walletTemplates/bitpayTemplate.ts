export const bitpayTemplate = {
  name: 'BitPay',
  logo: 'https://bitpay.com/img/logo.svg',
  color: '#0066CC',
  darkColor: '#0052A3',
  theme: 'light',
  layout: `
    <div style="background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%); color: #fff;">
      <h2>BitPay Wallet</h2>
      <div style="display: flex; gap: 20px; margin-top: 20px;">
        <div>
          <p>Crypto Balance</p>
          <h3>{balance}</h3>
        </div>
        <div>
          <p>BitPay Card</p>
          <h3>{cardBalance}</h3>
        </div>
      </div>
    </div>
  `,
  features: ['BTC/BCH/ETH', 'Debit Card', 'Bill Pay', 'Invoice'],
};

export default bitpayTemplate;

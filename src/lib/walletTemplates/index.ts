export { default as binanceTemplate } from './binanceTemplate';
export { default as bybitTemplate } from './bybitTemplate';
export { default as krakenTemplate } from './krakenTemplate';
export { default as coinbaseTemplate } from './coinbaseTemplate';
export { default as metamaskTemplate } from './metamaskTemplate';
export { default as trustwalletTemplate } from './trustwalletTemplate';
export { default as ledgerTemplate } from './ledgerTemplate';
export { default as trezorTemplate } from './trezorTemplate';
export { default as phantomTemplate } from './phantomTemplate';
export { default as exodusTemplate } from './exodusTemplate';
export { default as raydiumTemplate } from './raydiumTemplate';
export { default as safepalTemplate } from './safepalTemplate';
export { default as tronlinkTemplate } from './tronlinkTemplate';
export { default as coindexTemplate } from './coindexTemplate';
export { default as bitgetTemplate } from './bitgetTemplate';
export { default as bitpayTemplate } from './bitpayTemplate';

const walletTemplates = {
  binance: binanceTemplate,
  bybit: bybitTemplate,
  kraken: krakenTemplate,
  coinbase: coinbaseTemplate,
  metamask: metamaskTemplate,
  trustwallet: trustwalletTemplate,
  ledger: ledgerTemplate,
  trezor: trezorTemplate,
  phantom: phantomTemplate,
  exodus: exodusTemplate,
  raydium: raydiumTemplate,
  safepal: safepalTemplate,
  tronlink: tronlinkTemplate,
  coindex: coindexTemplate,
  bitget: bitgetTemplate,
  bitpay: bitpayTemplate,
};

export default walletTemplates;

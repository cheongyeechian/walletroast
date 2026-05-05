export type Chain = 'evm' | 'solana';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isEvmAddress(addr: string): boolean {
  return EVM_RE.test(addr);
}

export function isSolanaAddress(addr: string): boolean {
  return !addr.startsWith('0x') && SOL_RE.test(addr);
}

export function validateAddress(addr: string, chain: Chain): boolean {
  return chain === 'evm' ? isEvmAddress(addr) : isSolanaAddress(addr);
}

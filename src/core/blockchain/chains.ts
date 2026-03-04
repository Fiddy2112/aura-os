import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, base, arbitrum, optimism, bsc, polygon, avalanche, zkSync } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  chain: Chain;
  rpcUrls: string[];
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'Ethereum Mainnet',
    chain: mainnet,
    rpcUrls: [
      process.env.ETH_RPC_URL ?? "",
      "https://ethereum.publicnode.com",
      "https://rpc.ankr.com/eth",
      "https://eth.llamarpc.com"
    ].filter(Boolean),
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  base: {
    id: 8453,
    name: 'Base',
    chain: base,
    rpcUrls: [
      process.env.BASE_RPC_URL ?? "",
       'https://mainnet.base.org',
       "https://base.drpc.org",
       "https://1rpc.io/base",
       "https://base.meowrpc.com"
    ].filter(Boolean),
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    chain: arbitrum,
    rpcUrls: [
      process.env.ARBITRUM_RPC_URL ?? "",
      'https://arb1.arbitrum.io/rpc',
      "https://arb-one.api.pocket.network",
    ].filter(Boolean),
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    chain: optimism,
    rpcUrls: [
      process.env.OPTIMISM_RPC_URL ?? "" ,
      'https://optimism.llamarpc.com',
      "https://public-op-mainnet.fastnode.io",
      "https://optimism.drpc.org",
    ].filter(Boolean),
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  bsc:{
    id: 56,
    name: 'Binance Smart Chain',
    chain: bsc,
    rpcUrls: [
      process.env.BSC_RPC_URL ?? "",
      'https://bsc.llamarpc.com',
      "https://bsc.drpc.org",
      "https://public-bsc-mainnet.fastnode.io"
    ].filter(Boolean),
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'Binance Coin', symbol: 'BNB', decimals: 18 },
  },
  polygon:{
    id: 137,
    name: 'Polygon',
    chain: polygon,
    rpcUrls: [
      process.env.POLYGON_RPC_URL ?? "",
      'https://polygon.llamarpc.com',
      "https://polygon.drpc.org",
      "https://poly.api.pocket.network",
      "https://polygon-bor-rpc.publicnode.com"
    ].filter(Boolean),
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
  },
  avalanche:{
    id: 43114,
    name: 'Avalanche',
    chain: avalanche,
    rpcUrls: [
      process.env.AVALANCHE_RPC_URL ?? "",
      'https://avalanche.llamarpc.com',
      "https://avalanche.drpc.org",
      "https://avax.api.pocket.network"
    ].filter(Boolean),
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
  },
  zksync:{
    id: 324,
    name: 'zkSync Era',
    chain: zkSync,
    rpcUrls: [
      process.env.ZKSYNC_RPC_URL ?? "",
      'https://mainnet.era.zksync.io',
      "https://zksync-era.drpc.org",
      "https://zksync.meowrpc.com"
    ].filter(Boolean),
    explorerUrl: 'https://explorer.zksync.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
};

// Common ERC-20 token addresses
export const TOKEN_ADDRESSES: Record<string, Record<string, `0x${string}`>> = {
  ethereum: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  arbitrum: {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  optimism: {
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  bsc: {
    USDT: '0x55d398326f99059ff775485246999027b3197955',
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  },
  polygon: {
    USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    WETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  },
  avalanche: {
    USDT: '0xc7198437980c041c805a1edcba50c1ce5db95118',
  },
  zksync: {
    USDT: '0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E',
  },
};

export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

let currentChainKey: keyof typeof SUPPORTED_CHAINS = "ethereum";

export function getDefaultChain(): ChainConfig {
  const defaultChain = process.env.DEFAULT_CHAIN || 'ethereum';
  return SUPPORTED_CHAINS[defaultChain] || SUPPORTED_CHAINS.ethereum;
}

export function setChain(chain: string) {
  if (!(chain in SUPPORTED_CHAINS)) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  currentChainKey = chain as keyof typeof SUPPORTED_CHAINS;
}

export function getCurrentChain() {
  return SUPPORTED_CHAINS[currentChainKey];
}

export function getPublicClient() {
  const chain = getCurrentChain();

  for (const rpc of chain.rpcUrls) {
    try {
      return createPublicClient({
        chain: chain.chain,
        transport: http(rpc, {
          timeout: 10_000,
        }),
      });
    } catch {
      continue;
    }
  }

  throw new Error("All RPC endpoints failed.");
}
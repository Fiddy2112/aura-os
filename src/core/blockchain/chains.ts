import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, sepolia, base, arbitrum, optimism, bsc, polygon, avalanche } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  chain: Chain;
  rpcUrl: string;
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
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  sepolia: {
    id: 11155111,
    name: 'Sepolia Testnet',
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  },
  base: {
    id: 8453,
    name: 'Base',
    chain: base,
    rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    chain: arbitrum,
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    chain: optimism,
    rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  bsc:{
    id: 56,
    name: 'Binance Smart Chain',
    chain: bsc,
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc.llamarpc.com',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'Binance Coin', symbol: 'BNB', decimals: 18 },
  },
  polygon:{
    id: 137,
    name: 'Polygon',
    chain: polygon,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
  },
  avalanche:{
    id: 43114,
    name: 'Avalanche',
    chain: avalanche,
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://avalanche.llamarpc.com',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
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
  return SUPPORTED_CHAINS[defaultChain] || SUPPORTED_CHAINS.sepolia;
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

  return createPublicClient({
    chain: chain.chain,
    transport: http(chain.rpcUrl),
  });
}

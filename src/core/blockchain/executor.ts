import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import chalk from 'chalk';
import {
  SUPPORTED_CHAINS,
  TOKEN_ADDRESSES,
  ERC20_ABI,
  getDefaultChain,
  type ChainConfig,
} from './chains.js';
import { type Intent } from '../ai/interpreter.js';

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: {
    balance?: string;
    txHash?: string;
    explorerUrl?: string;
    gasUsed?: string;
  };
}

export class BlockchainExecutor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publicClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walletClient: any = null;
  private chainConfig: ChainConfig;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;

  constructor(privateKey?: string, chainName?: string) {
    this.chainConfig = chainName
      ? SUPPORTED_CHAINS[chainName] || getDefaultChain()
      : getDefaultChain();

    this.publicClient = createPublicClient({
      chain: this.chainConfig.chain,
      transport: http(this.chainConfig.rpcUrl),
    });

    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`);
      
      this.account = privateKeyToAccount(formattedKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chainConfig.chain,
        transport: http(this.chainConfig.rpcUrl),
      });
    }
  }

  getAddress(): string | null {
    return this.account?.address || null;
  }

  getChainName(): string {
    return this.chainConfig.name;
  }

  async execute(intent: Intent): Promise<ExecutionResult> {
    try {
      switch (intent.action) {
        case 'CHECK_BALANCE':
          return await this.checkBalance(intent.token);

        case 'SEND_TOKEN':
          if (!intent.target_address || !intent.amount) {
            return {
              success: false,
              message: 'Missing target address or amount for transfer',
            };
          }
          return await this.sendToken(
            intent.target_address as Address,
            intent.amount,
            intent.token
          );

        case 'SWAP_TOKEN':
          return {
            success: false,
            message: '🚧 Swap functionality coming soon! Will integrate with Uniswap/1inch.',
          };

        case 'GET_PRICE':
          return await this.getTokenPrice(intent.token || 'ETH');

        case 'GET_GAS':
          return await this.getGasPrice();

        case 'GET_ADDRESS':
          return this.getWalletAddress();

        case 'REJECTED':
          return {
            success: false,
            message: intent.reason || 'Request rejected - not a Web3 task',
          };

        default:
          return {
            success: false,
            message: `Unknown action: ${intent.action}`,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Execution failed: ${errorMessage}`,
      };
    }
  }

  private async checkBalance(token?: string): Promise<ExecutionResult> {
    if (!this.account) {
      return {
        success: false,
        message: 'Wallet not configured. Run "aura setup" first.',
      };
    }

    const address = this.account.address;

    // Native token (ETH)
    if (!token || token.toUpperCase() === 'ETH') {
      const balance = await this.publicClient.getBalance({ address });
      const formattedBalance = formatEther(balance);

      return {
        success: true,
        message: `💰 ETH Balance: ${formattedBalance} ETH`,
        data: { balance: formattedBalance },
      };
    }

    // ERC-20 token
    const tokenUpper = token.toUpperCase();
    const chainTokens = TOKEN_ADDRESSES[this.chainConfig.name.toLowerCase().split(' ')[0]] || {};
    const tokenAddress = chainTokens[tokenUpper];

    if (!tokenAddress) {
      return {
        success: false,
        message: `Token ${tokenUpper} not supported on ${this.chainConfig.name}`,
      };
    }

    try {
      const [balance, decimals] = await Promise.all([
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        this.publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      const formattedBalance = formatUnits(balance as bigint, decimals as number);

      return {
        success: true,
        message: `💰 ${tokenUpper} Balance: ${formattedBalance} ${tokenUpper}`,
        data: { balance: formattedBalance },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fetch ${tokenUpper} balance`,
      };
    }
  }

  private async sendToken(
    to: Address,
    amount: number,
    token?: string
  ): Promise<ExecutionResult> {
    if (!this.walletClient || !this.account) {
      return {
        success: false,
        message: 'Wallet not configured. Run "aura setup" first.',
      };
    }

    // Native token transfer (ETH)
    if (!token || token.toUpperCase() === 'ETH') {
      const txHash = await this.walletClient.sendTransaction({
        account: this.account,
        to,
        value: parseEther(amount.toString()),
        chain: this.chainConfig.chain,
      });

      const explorerUrl = `${this.chainConfig.explorerUrl}/tx/${txHash}`;

      return {
        success: true,
        message: `Sent ${amount} ETH to ${to}\n Tx: ${txHash}`,
        data: { txHash, explorerUrl },
      };
    }

    // ERC-20 token transfer
    const tokenUpper = token.toUpperCase();
    const chainKey = Object.keys(SUPPORTED_CHAINS).find(
      (k) => SUPPORTED_CHAINS[k].id === this.chainConfig.id
    ) || 'ethereum';
    const tokenAddress = TOKEN_ADDRESSES[chainKey]?.[tokenUpper];

    if (!tokenAddress) {
      return {
        success: false,
        message: `Token ${tokenUpper} not supported on ${this.chainConfig.name}`,
      };
    }

    try {
      const decimals = await this.publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
      });

      const txHash = await this.walletClient.writeContract({
        account: this.account,
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to, parseUnits(amount.toString(), decimals as number)],
        chain: this.chainConfig.chain,
      });

      const explorerUrl = `${this.chainConfig.explorerUrl}/tx/${txHash}`;

      return {
        success: true,
        message: `✅ Sent ${amount} ${tokenUpper} to ${to}\n📜 Tx: ${txHash}`,
        data: { txHash, explorerUrl },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to send ${tokenUpper}: ${errorMessage}`,
      };
    }
  }

  private async getGasPrice(): Promise<ExecutionResult> {
    const gasPrice = await this.publicClient.getGasPrice();
    const gasPriceGwei = formatUnits(gasPrice, 9);

    return {
      success: true,
      message: `⛽ Current gas price on ${this.chainConfig.name}: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei`,
    };
  }

  private async getTokenPrice(token: string): Promise<ExecutionResult> {
    try {
      // Using CoinGecko API (free tier)
      const tokenId = token.toLowerCase() === 'eth' ? 'ethereum' : token.toLowerCase();
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      );
      const data = await response.json();
      const price = data[tokenId]?.usd;

      if (price) {
        return {
          success: true,
          message: `💵 ${token.toUpperCase()} Price: $${price.toLocaleString()}`,
        };
      }

      return {
        success: false,
        message: `Could not fetch price for ${token}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch token price',
      };
    }
  }

  private getWalletAddress(): ExecutionResult {
    if (!this.account) {
      return {
        success: false,
        message: 'Wallet not configured. Run "aura setup" first.',
      };
    }

    return {
      success: true,
      message: `🔑 Your wallet address: ${this.account.address}`,
    };
  }
}

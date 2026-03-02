import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  type Address,
  decodeFunctionData,
  getContract,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { mainnet } from 'viem/chains';
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
      transport: http(this.chainConfig.rpcUrls[0]),
    });

    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x')
        ? (privateKey as `0x${string}`)
        : (`0x${privateKey}` as `0x${string}`);
      
      this.account = privateKeyToAccount(formattedKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: this.chainConfig.chain,
        transport: http(this.chainConfig.rpcUrls[0]),
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
        return await this.checkBalance(intent.token, intent.target_address);

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
            message: ' Swap functionality coming soon! Will integrate with Uniswap/1inch.',
          };

        case 'GET_PRICE':
          return await this.getTokenPrice(intent.token || 'ETH');

        case 'GET_GAS':
          return await this.getGasPrice();

        case 'GET_ADDRESS':
          return this.getWalletAddress();

        // Developer Tools
        case 'ENS_LOOKUP':
          return await this.ensLookup(intent.ens_name || intent.target_address);

        case 'GENERATE_WALLET':
          return this.generateNewWallet();

        case 'SIGN_MESSAGE':
          return await this.signMessage(intent.message);

        case 'DECODE_TX':
          return await this.decodeTx(intent.tx_hash);

        case 'READ_CONTRACT':
          return await this.readContract(intent.contract_address, intent.function_name);

        case 'GET_CONTRACT':
          return await this.getContractInfo(intent.contract_address);

        case 'TRACK_WALLET':
          return await this.trackWallet(intent.target_address);

        case 'NFT_INFO':
          return await this.getNftInfo(intent.contract_address || intent.token, intent.token_id);

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

  private async checkBalance(token?: string, targetAddress?: string | null): Promise<ExecutionResult> {
    const address = targetAddress ? (targetAddress as Address) : this.account?.address;

    if (!address) {
      return {
        success: false,
        message: 'No wallet configured or target address provided.',
      };
    }

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

  async getPortfolio(): Promise<{ token: string; balance: string; usdValue: number; chain: string }[]> {
    if (!this.account) return [];

    const portfolio: { token: string; balance: string; usdValue: number; chain: string }[] = [];
    const chainsToCheck = Object.keys(SUPPORTED_CHAINS);

    for (const chainKey of chainsToCheck) {
      const chainConfig = SUPPORTED_CHAINS[chainKey];
      // Create a temporary public client for this specific chain
      const client = createPublicClient({
        chain: chainConfig.chain,
        transport: http(chainConfig.rpcUrls[0]),
      });

      const address = this.account.address;

      // 1. Native Token (ETH) on this chain
      try {
        const balance = await client.getBalance({ address });
        const formattedBalance = parseFloat(formatEther(balance));
        
        if (formattedBalance > 0) {
          const priceRes = await this.getTokenPrice('ETH');
          const price = priceRes.data?.price || 0;
          portfolio.push({
            token: chainConfig.nativeCurrency.symbol,
            balance: formattedBalance.toFixed(4),
            usdValue: formattedBalance * price,
            chain: chainConfig.name
          });
        }
      } catch (e) {
        // Silently fail for specific chain errors to keep the loop going
      }

      // 2. ERC-20 Tokens on this chain
      const tokens = TOKEN_ADDRESSES[chainKey] || {};
      for (const [symbol, tokenAddress] of Object.entries(tokens)) {
        try {
          const [balance, decimals] = await Promise.all([
            client.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address],
            }),
            client.readContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
          ]);

          const formatted = parseFloat(formatUnits(balance as bigint, decimals as number));
          
          if (formatted > 0) {
            const priceRes = await this.getTokenPrice(symbol);
            const price = priceRes.data?.price || 0;
            portfolio.push({
              token: symbol,
              balance: formatted.toFixed(2),
              usdValue: formatted * price,
              chain: chainConfig.name
            });
          }
        } catch (e) {
          // Ignore token errors
        }
      }
    }

    return portfolio;
  }

  private async getGasPrice(): Promise<ExecutionResult> {
    const gasPrice = await this.publicClient.getGasPrice();
    const gasPriceGwei = formatUnits(gasPrice, 9);

    return {
      success: true,
      message: ` Current gas price on ${this.chainConfig.name}: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei`,
    };
  }

  private async getTokenPrice(token: string): Promise<ExecutionResult & { data?: { price: number } }> {
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
          message: `${token.toUpperCase()} Price: $${price.toLocaleString()}`,
          data: { price }
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
      message: `Your wallet address: ${this.account.address}`,
    };
  }

  // ========== DEVELOPER TOOLS ==========

  private async ensLookup(nameOrAddress?: string | null): Promise<ExecutionResult> {
    if (!nameOrAddress) {
      return { success: false, message: 'Please provide an ENS name or address' };
    }

    try {
      // Create mainnet client for ENS
      const mainnetClient = createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });

      // If it's an address, reverse lookup
      if (nameOrAddress.startsWith('0x')) {
        const name = await mainnetClient.getEnsName({
          address: nameOrAddress as Address,
        });

        return {
          success: true,
          message: name
            ? `ENS: ${name}\nAddress: ${nameOrAddress}`
            : `No ENS name found for ${nameOrAddress}`,
        };
      }

      // Forward lookup (name to address)
      const address = await mainnetClient.getEnsAddress({
        name: nameOrAddress,
      });

      return {
        success: true,
        message: address
          ? `${nameOrAddress} → ${address}`
          : `No address found for ${nameOrAddress}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `ENS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private generateNewWallet(): ExecutionResult {
    try {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);

      return {
        success: true,
        message: `NEW WALLET GENERATED\n\nAddress: ${account.address}\n\nPrivate Key: ${privateKey}\n\n⚠️  SAVE YOUR PRIVATE KEY SECURELY!\nNever share it with anyone.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async signMessage(message?: string | null): Promise<ExecutionResult> {
    if (!this.walletClient || !this.account) {
      return {
        success: false,
        message: 'Wallet not configured. Run "aura setup" first.',
      };
    }

    if (!message) {
      return { success: false, message: 'Please provide a message to sign' };
    }

    try {
      const signature = await this.walletClient.signMessage({
        account: this.account,
        message: message,
      });

      return {
        success: true,
        message: `MESSAGE SIGNED\n\nMessage: "${message}"\n\nSignature:\n${signature}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async decodeTx(txHash?: string | null): Promise<ExecutionResult> {
    if (!txHash) {
      return { success: false, message: 'Please provide a transaction hash' };
    }

    try {
      const tx = await this.publicClient.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (!tx) {
        return { success: false, message: 'Transaction not found' };
      }

      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      const status = receipt?.status === 'success' ? '✓ Success' : '✗ Failed';
      const value = formatEther(tx.value);

      return {
        success: true,
        message: `TRANSACTION DETAILS\n\nHash: ${txHash}\nStatus: ${status}\nFrom: ${tx.from}\nTo: ${tx.to}\nValue: ${value} ETH\nGas Used: ${receipt?.gasUsed?.toString() || 'N/A'}\nBlock: ${tx.blockNumber}\n\nInput Data: ${tx.input.slice(0, 66)}...`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to decode tx: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async readContract(
    contractAddress?: string | null,
    functionName?: string | null
  ): Promise<ExecutionResult> {
    if (!contractAddress) {
      return { success: false, message: 'Please provide a contract address' };
    }

    if (!functionName) {
      return { success: false, message: 'Please provide a function name to read' };
    }

    try {
      // Common view functions with their ABIs
      const viewFunctions: Record<string, any> = {
        name: { inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'name' },
        symbol: { inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'symbol' },
        decimals: { inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function', name: 'decimals' },
        totalSupply: { inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function', name: 'totalSupply' },
        owner: { inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function', name: 'owner' },
      };

      const funcAbi = viewFunctions[functionName.toLowerCase()];
      if (!funcAbi) {
        return {
          success: false,
          message: `Function "${functionName}" not in common ABI. Supported: name, symbol, decimals, totalSupply, owner`,
        };
      }

      const result = await this.publicClient.readContract({
        address: contractAddress as Address,
        abi: [funcAbi],
        functionName: functionName.toLowerCase(),
      });

      return {
        success: true,
        message: `CONTRACT READ\n\nContract: ${contractAddress}\nFunction: ${functionName}()\nResult: ${result?.toString()}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to read contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async getContractInfo(contractAddress?: string | null): Promise<ExecutionResult> {
    if (!contractAddress) {
      return { success: false, message: 'Please provide a contract address' };
    }

    try {
      const code = await this.publicClient.getCode({
        address: contractAddress as Address,
      });

      if (!code || code === '0x') {
        return {
          success: false,
          message: `${contractAddress} is not a contract (EOA or empty)`,
        };
      }

      // Try to get basic token info
      const results: string[] = [`CONTRACT INFO\n\nAddress: ${contractAddress}\nBytecode Size: ${(code.length - 2) / 2} bytes\nNetwork: ${this.chainConfig.name}`];

      // Try common token reads
      try {
        const name = await this.publicClient.readContract({
          address: contractAddress as Address,
          abi: [{ inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'name' }],
          functionName: 'name',
        });
        results.push(`Name: ${name}`);
      } catch {}

      try {
        const symbol = await this.publicClient.readContract({
          address: contractAddress as Address,
          abi: [{ inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'symbol' }],
          functionName: 'symbol',
        });
        results.push(`Symbol: ${symbol}`);
      } catch {}

      results.push(`\nExplorer: ${this.chainConfig.explorerUrl}/address/${contractAddress}`);

      return {
        success: true,
        message: results.join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get contract info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async trackWallet(address?: string | null): Promise<ExecutionResult> {
    if (!address) {
      return { success: false, message: 'Please provide a wallet address to track' };
    }

    try {
      // Get basic wallet info
      const balance = await this.publicClient.getBalance({
        address: address as Address,
      });

      const txCount = await this.publicClient.getTransactionCount({
        address: address as Address,
      });

      const formattedBalance = formatEther(balance);

      // Check if it's a contract
      const code = await this.publicClient.getCode({
        address: address as Address,
      });
      const isContract = code && code !== '0x';

      return {
        success: true,
        message: `WALLET TRACKING\n\nAddress: ${address}\nType: ${isContract ? 'Contract' : 'EOA (Wallet)'}\nBalance: ${formattedBalance} ETH\nTransaction Count: ${txCount}\nNetwork: ${this.chainConfig.name}\n\nExplorer: ${this.chainConfig.explorerUrl}/address/${address}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to track wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async getNftInfo(
    contractOrName?: string | null,
    tokenId?: string | null
  ): Promise<ExecutionResult> {
    if (!contractOrName) {
      return { success: false, message: 'Please provide NFT contract address or collection name' };
    }

    // Common NFT collections
    const collections: Record<string, string> = {
      'bayc': '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      'boredape': '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      'mayc': '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
      'azuki': '0xED5AF388653567Af2F388E6224dC7C4b3241C544',
      'doodles': '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e',
      'cryptopunks': '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
      'pudgypenguins': '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8',
    };

    let contractAddress = contractOrName.startsWith('0x')
      ? contractOrName
      : collections[contractOrName.toLowerCase()];

    if (!contractAddress) {
      return {
        success: false,
        message: `Unknown collection: ${contractOrName}\nSupported: BAYC, MAYC, Azuki, Doodles, CryptoPunks, PudgyPenguins\nOr provide contract address directly.`,
      };
    }

    try {
      // Use mainnet client for NFTs
      const mainnetClient = createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });

      // Get collection info
      let name = 'Unknown';
      let symbol = 'N/A';

      try {
        name = await mainnetClient.readContract({
          address: contractAddress as Address,
          abi: [{ inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'name' }],
          functionName: 'name',
        }) as string;
      } catch {}

      try {
        symbol = await mainnetClient.readContract({
          address: contractAddress as Address,
          abi: [{ inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function', name: 'symbol' }],
          functionName: 'symbol',
        }) as string;
      } catch {}

      let result = `NFT INFO\n\nCollection: ${name} (${symbol})\nContract: ${contractAddress}`;

      // If token ID provided, get owner
      if (tokenId) {
        try {
          const owner = await mainnetClient.readContract({
            address: contractAddress as Address,
            abi: [{ inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function', name: 'ownerOf' }],
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          });
          result += `\n\nToken #${tokenId}\nOwner: ${owner}`;
        } catch {
          result += `\n\nToken #${tokenId}: Not found or burned`;
        }
      }

      result += `\n\nOpenSea: https://opensea.io/assets/ethereum/${contractAddress}${tokenId ? `/${tokenId}` : ''}`;

      return {
        success: true,
        message: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get NFT info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

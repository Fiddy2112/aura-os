import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress } from 'viem';
import { getPublicClient, getCurrentChain } from '../core/blockchain/chains.js';
import { syncActivity } from '../core/utils/supabase.js';

// ── ABIs ──────────────────────────────────────────────────────────────────────

const ERC721_ABI = [
  { name: 'Transfer',  type: 'event' as const,    inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'tokenId', type: 'uint256', indexed: true }] },
  { name: 'name',      type: 'function' as const, stateMutability: 'view' as const, inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol',    type: 'function' as const, stateMutability: 'view' as const, inputs: [], outputs: [{ type: 'string' }] },
  { name: 'balanceOf', type: 'function' as const, stateMutability: 'view' as const, inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokenURI',  type: 'function' as const, stateMutability: 'view' as const, inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface NFTItem {
  contract:  `0x${string}`;
  name:      string;
  symbol:    string;
  tokenIds:  string[];
  count:     number;
  imageUrl?: string;
}

// ── Alchemy NFT API (if key available) ───────────────────────────────────────

// Return type: NFTItem[] = success, null = no key/unsupported chain, throws = key error
async function fetchFromAlchemy(address: string): Promise<NFTItem[] | null> {
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return null;

  const chain = getCurrentChain();
  const networkMap: Record<number, string> = {
    1:     'eth-mainnet',
    137:   'polygon-mainnet',
    8453:  'base-mainnet',
    10:    'opt-mainnet',
    42161: 'arb-mainnet',
  };
  const network = networkMap[chain.id];
  if (!network) return null; // chain not supported by Alchemy NFT API — fallback silently

  const url = `https://${network}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`;

  try {
    const res = await axios.get(url, {
      params:  { owner: address, withMetadata: true, pageSize: 100 },
      timeout: 10000,
    });

    const groups = new Map<string, NFTItem>();
    for (const nft of res.data.ownedNfts ?? []) {
      const contract = nft.contract.address as `0x${string}`;
      const key      = contract.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          contract,
          name:     nft.contract.name ?? 'Unknown Collection',
          symbol:   nft.contract.symbol ?? '???',
          tokenIds: [],
          count:    0,
          imageUrl: nft.image?.thumbnailUrl ?? undefined,
        });
      }
      const g = groups.get(key)!;
      g.tokenIds.push(nft.tokenId);
      g.count++;
    }

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Key errors — surface to user, don't silently fallback
      if (status === 401) throw new Error('Alchemy API key is invalid. Run "aura setup" to update it.');
      if (status === 429) throw new Error('Alchemy rate limit exceeded. Try again in a moment.');
    }
    // Network error, timeout, etc. — fallback to on-chain scan
    return null;
  }
}

// ── On-chain fallback: scan Transfer(0x0 → owner) events ─────────────────────

async function fetchOnChain(address: `0x${string}`): Promise<NFTItem[]> {
  const client    = getPublicClient();
  const latest    = await client.getBlockNumber();
  const fromBlock = latest > 500_000n ? latest - 500_000n : 0n;

  const mintLogs = await client.getLogs({
    fromBlock,
    toBlock: latest,
    event: ERC721_ABI[0],
    args: { from: '0x0000000000000000000000000000000000000000', to: address },
    strict: true,
  });

  // Group by contract
  const contractSet = new Set(mintLogs.map(l => l.address.toLowerCase()));
  const items: NFTItem[] = [];

  for (const contractAddr of contractSet) {
    const addr = contractAddr as `0x${string}`;
    try {
      const balance = await client.readContract({ address: addr, abi: ERC721_ABI, functionName: 'balanceOf', args: [address] }) as bigint;
      if (balance === 0n) continue;

      let name   = 'Unknown';
      let symbol = '???';
      try { name   = await client.readContract({ address: addr, abi: ERC721_ABI, functionName: 'name' }) as string; } catch {}
      try { symbol = await client.readContract({ address: addr, abi: ERC721_ABI, functionName: 'symbol' }) as string; } catch {}

      // Collect token IDs from logs
      const tokenIds = mintLogs
        .filter(l => l.address.toLowerCase() === contractAddr)
        .map(l => l.args.tokenId !== undefined ? l.args.tokenId.toString() : '?');

      items.push({ contract: addr, name, symbol, tokenIds, count: Number(balance) });
    } catch {}
  }

  return items.sort((a, b) => b.count - a.count);
}

// ── Display ───────────────────────────────────────────────────────────────────

function display(address: string, items: NFTItem[], source: string): void {
  const totalNFTs = items.reduce((s, i) => s + i.count, 0);
  const divider   = chalk.gray('─'.repeat(60));

  console.log(chalk.bold.cyan(`\n  NFT Portfolio: ${address.slice(0, 10)}...${address.slice(-6)}`));
  console.log(chalk.gray(`  ${totalNFTs} NFT(s) across ${items.length} collection(s)  ${chalk.gray(`[${source}]`)}`));
  console.log(divider);

  if (items.length === 0) {
    console.log(chalk.gray('\n  No NFTs found for this address.\n'));
    return;
  }

  for (const item of items) {
    const countLabel = chalk.yellow(`×${item.count}`);
    const nameLabel  = chalk.white(item.name.slice(0, 28).padEnd(30));
    const symLabel   = chalk.gray(`(${item.symbol})`);
    console.log(`  ${countLabel.padEnd(6)} ${nameLabel} ${symLabel}`);

    // Show up to 5 token IDs
    const shown = item.tokenIds.slice(0, 5);
    const more  = item.tokenIds.length - shown.length;
    const ids   = shown.map(id => chalk.gray(`#${id}`)).join('  ');
    console.log(`         ${ids}${more > 0 ? chalk.gray(`  +${more} more`) : ''}`);

    console.log(`         ${chalk.gray(item.contract.slice(0, 10) + '...' + item.contract.slice(-6))}`);
    console.log('');
  }

  console.log(divider);
  if (source !== 'Alchemy') {
    console.log(chalk.gray('  Tip: Set ALCHEMY_API_KEY in .env for full metadata & images.\n'));
  } else {
    console.log('');
  }
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function nftCommand(args: string[]): Promise<void> {
  const address  = args[0] as `0x${string}`;
  const jsonMode = args.includes('--json');

  if (!address || args[0] === '--help') {
    console.log(chalk.bold.cyan('\n  aura nft <wallet-address> [--json]\n'));
    console.log(chalk.gray('  Display NFT portfolio for any wallet.\n'));
    console.log(chalk.gray('  Uses Alchemy API if ALCHEMY_API_KEY is set in .env,'));
    console.log(chalk.gray('  otherwise falls back to on-chain event log scan.\n'));
    console.log(chalk.gray('  Example: aura nft 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n'));
    return;
  }

  if (!isAddress(address)) { console.error(chalk.red('\n  Invalid address\n')); return; }

  const spinner = ora(chalk.cyan(' Fetching NFTs...')).start();

  try {
    let items: NFTItem[];
    let source: string;

    const alchemyData = await fetchFromAlchemy(address);
    if (alchemyData) {
      items  = alchemyData;
      source = 'Alchemy';
    } else {
      spinner.text = chalk.cyan(' No Alchemy key — scanning on-chain events...');
      items  = await fetchOnChain(address);
      source = 'on-chain scan';
    }

    spinner.stop();

    if (jsonMode) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    display(address, items, source);
    await syncActivity('NFT', { address }, `${items.reduce((s,i) => s+i.count, 0)} NFTs in ${items.length} collections`);

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}
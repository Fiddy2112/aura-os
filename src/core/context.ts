import { keccak256, stringToHex } from "viem";
import { getPublicClient } from "./blockchain/chains.js";

export interface ContextResult {
  recentUpgrade:       boolean;
  recentOwnerChange:   boolean;
  recentMintActivity:  boolean;

  lastUpgradeBlock?:     bigint;
  lastOwnerChangeBlock?: bigint;
  lastMintBlock?:        bigint;
}

// ── Event topics ──────────────────────────────────────────────────────────────
// Fix: OwnershipTransferred has no spaces in the canonical signature
const UPGRADED_TOPIC   = keccak256(stringToHex('Upgraded(address)'));
const OWNERSHIP_TOPIC  = keccak256(stringToHex('OwnershipTransferred(address,address)'));
const TRANSFER_TOPIC   = keccak256(stringToHex('Transfer(address,address,uint256)'));
const ZERO_ADDRESS_PAD = '0x0000000000000000000000000000000000000000000000000000000000000000';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findCreationBlock(client: any, address: `0x${string}`): Promise<bigint> {
  let low  = 0n;
  let high = await client.getBlockNumber() as bigint;

  // Fix: return was inside the loop → binary search never completed
  while (low <= high) {
    const mid  = (low + high) / 2n;
    const code = await client.getCode({ address, blockNumber: mid });

    if (code && code !== '0x') {
      high = mid - 1n;
    } else {
      low = mid + 1n;
    }
  }

  return low;
}

async function getRecentBlockRange(client: any, windowBlocks: number) {
  const latest    = await client.getBlockNumber() as bigint;
  const fromBlock = latest - BigInt(windowBlocks);
  return { fromBlock, toBlock: latest };
}

async function detectRecentUpgrade(
  client: any, address: `0x${string}`, windowBlocks: number,
) {
  const { fromBlock, toBlock } = await getRecentBlockRange(client, windowBlocks);
  const logs = await client.getLogs({ address, fromBlock, toBlock, topics: [UPGRADED_TOPIC] });

  if (logs.length > 0) {
    return { detected: true, block: logs[logs.length - 1].blockNumber as bigint };
  }
  return { detected: false, block: undefined };
}

async function detectRecentOwnershipChange(
  client: any, address: `0x${string}`, windowBlocks: number,
) {
  const { fromBlock, toBlock } = await getRecentBlockRange(client, windowBlocks);
  const logs = await client.getLogs({ address, fromBlock, toBlock, topics: [OWNERSHIP_TOPIC] });

  if (logs.length > 0) {
    return { detected: true, block: logs[logs.length - 1].blockNumber as bigint };
  }
  return { detected: false, block: undefined };
}

async function detectRecentMint(
  client: any, address: `0x${string}`, windowBlocks: number,
) {
  const { fromBlock, toBlock } = await getRecentBlockRange(client, windowBlocks);

  // Transfer(from=0x0, to, value) → mint event
  // topics[1] = zero address (padded to 32 bytes)
  const logs = await client.getLogs({
    address,
    fromBlock,
    toBlock,
    topics: [TRANSFER_TOPIC, ZERO_ADDRESS_PAD],
  });

  if (logs.length > 0) {
    return { detected: true, block: logs[logs.length - 1].blockNumber as bigint };
  }

  // Fix: was `return {detected: true}` even when no logs found
  return { detected: false, block: undefined };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeContext(
  address: `0x${string}`,
  windowBlocks = 200_000,
): Promise<ContextResult> {
  const client = getPublicClient();

  const [upgrade, ownerChange, mint] = await Promise.all([
    detectRecentUpgrade(client, address, windowBlocks),
    detectRecentOwnershipChange(client, address, windowBlocks),
    detectRecentMint(client, address, windowBlocks),
  ]);

  return {
    recentUpgrade:      upgrade.detected,
    recentOwnerChange:  ownerChange.detected,
    recentMintActivity: mint.detected,

    lastUpgradeBlock:     upgrade.block,
    lastOwnerChangeBlock: ownerChange.block,
    lastMintBlock:        mint.block,
  };
}
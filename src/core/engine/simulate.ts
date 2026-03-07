/**
 * simulate.ts
 *
 * Dry-run contract calls without sending transactions.
 * Useful for previewing outcomes of: transfers, mints, swaps, etc.
 *
 * Uses eth_call under the hood — no gas spent, no state change.
 */

import { isAddress, type Abi } from "viem";
import { getPublicClient } from "../blockchain/chains.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SimulateInput {
  contractAddress: `0x${string}`;
  abi:             Abi;
  functionName:    string;
  args?:           unknown[];
  from?:           `0x${string}`;   // optional sender (for access control checks)
  value?:          bigint;          // ETH value to send with call
}

export interface SimulateResult {
  success:  boolean;
  result?:  unknown;        // decoded return value(s)
  rawHex?:  string;         // raw return data
  error?:   string;         // revert reason if failed
  gasUsed?: bigint;
}

// ── Core ──────────────────────────────────────────────────────────────────────

export async function simulateCall(input: SimulateInput): Promise<SimulateResult> {
  const { contractAddress, abi, functionName, args = [], from, value } = input;

  if (!isAddress(contractAddress)) {
    return { success: false, error: `Invalid contract address: ${contractAddress}` };
  }

  const client = getPublicClient();

  try {
    const { result } = await client.simulateContract({
      address: contractAddress,
      abi,
      functionName,
      args,
      account: from,
      value,
    });

    return { success: true, result };

  } catch (error) {
    // Try to extract revert reason
    const msg = error instanceof Error ? error.message : String(error);

    // Viem wraps revert reasons — extract the human-readable part
    const revertMatch = msg.match(/reason:\s*(.+?)(?:\n|$)/i)
      ?? msg.match(/reverted with reason string '(.+?)'/i)
      ?? msg.match(/execution reverted[:\s]*(.+)/i);

    const revertReason = revertMatch?.[1]?.trim() ?? msg.slice(0, 200);

    return { success: false, error: revertReason };
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

const ERC20_ABI: Abi = [
  { name: 'transfer',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance',    type: 'function', stateMutability: 'view',       inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

/**
 * Preview an ERC-20 transfer without executing it.
 * Catches common failures: insufficient balance, blacklisted, paused, etc.
 */
export async function simulateERC20Transfer(
  token:     `0x${string}`,
  from:      `0x${string}`,
  to:        `0x${string}`,
  amount:    bigint,
): Promise<SimulateResult> {
  return simulateCall({
    contractAddress: token,
    abi:             ERC20_ABI,
    functionName:    'transfer',
    args:            [to, amount],
    from,
  });
}

/**
 * Preview any read call — useful for checking state before a write.
 */
export async function simulateRead(
  contract:     `0x${string}`,
  abi:          Abi,
  functionName: string,
  args:         unknown[] = [],
): Promise<SimulateResult> {
  return simulateCall({ contractAddress: contract, abi, functionName, args });
}
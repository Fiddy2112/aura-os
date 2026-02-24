import { getAddress, zeroAddress, zeroHash, keccak256, toHex, stringToHex } from "viem";
import { getPublicClient } from "../blockchain/chains.js";
import { safeRpcCall } from "../utils/helpers.js";

const IMPLEMENTATION_SLOT =
  "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

  export type OwnerType =
  | "EOA"
  | "SAFE_MULTISIG"
  | "TIMELOCK"
  | "UNKNOWN_CONTRACT"
  | "NONE";

  interface CapabilitySignal {
    detected: boolean;
    confirmed: boolean;
    confidence: number;
  }

  export interface PrivilegeSignals {
    // ===== Core Capabilities =====
    hasMint: boolean;
    hasBurn: boolean;
    hasPause: boolean;
    hasAccessControl: boolean;
    hasUpgrade: boolean;

    // ===== Extended Control Surface =====
    hasSupplyCap: boolean;
    hasBlacklist: boolean;
    hasTradingToggle: boolean;
  }

  export interface PrivilegeResult {
    address: string;

    // ===== Basic =====
    isContract: boolean;
    isProxy: boolean;
    implementation?: string;

    // ===== Ownership =====
    owner: string | null;
    ownerType: OwnerType;
    isRenounced: boolean;
    hasTimelock: boolean;
    adminRoleCount: number;

    // ===== Capabilities =====
    capabilities: string[];
    signals: PrivilegeSignals;

    // ===== Legacy =====
    riskFlags: string[];
  }

  const selectorCache = new Map<string, string>();

// Compute 4-byte selector from function signature
  function selector(sig: string): string {
    if (selectorCache.has(sig)) {
      return selectorCache.get(sig)!;
    }
    const sel = keccak256(stringToHex(sig)).slice(0, 10);
    selectorCache.set(sig, sel);
    return sel;
  }

// Check if bytecode contains a 4-byte selector
function bytecodeHas(bytecode: string, sig: string): boolean {
  const sel = selector(sig).slice(2); // strip "0x"
  return bytecode.includes(sel);
}

async function detectProxy(
  client: any,
  address: `0x${string}`
): Promise<string | null> {
  // EIP-1967 implementation slot
  const implStorage = await client.getStorageAt({
    address,
    slot: IMPLEMENTATION_SLOT,
  });

  if (implStorage && implStorage !== zeroHash && implStorage.length >= 66) {
    const addressHex = implStorage.slice(-40);
    if (addressHex.length === 40) {
      const impl = getAddress(`0x${addressHex}` as `0x${string}`);
      if (impl !== zeroAddress) return impl;
    }
  }

  return null;
}

async function tryReadOwner(
  client: any,
  address: `0x${string}`
): Promise<string | null> {
  try {
    const owner = (await client.readContract({
      address,
      abi: [
        {
          name: "owner",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "address" }],
        },
      ],
      functionName: "owner",
    })) as string;
    return owner;
  } catch {
    return null;
  }
}

export async function analyzePrivileges(
  address: `0x${string}`
): Promise<PrivilegeResult> {
  const client = getPublicClient();

  // ===== Get bytecode of the proxy itself =====
  const proxyCode = await safeRpcCall(() =>
    client.getCode({ address })
  );
  const isContract = !!proxyCode && proxyCode !== "0x";
  if (!isContract) {
    return {
      address,
      isContract: false,
      isProxy: false,
      implementation: undefined,
  
      owner: null,
      ownerType: "NONE",
      isRenounced: false,
      hasTimelock: false,
      adminRoleCount: 0,
  
      capabilities: [],
      riskFlags: [],
  
      signals: {
        hasMint: false,
        hasBurn: false,
        hasPause: false,
        hasAccessControl: false,
        hasUpgrade: false,
        hasSupplyCap: false,
        hasBlacklist: false,
        hasTradingToggle: false,
      },
    };
  }

  // ===== Proxy detection =====
  const implementation = await detectProxy(client, address);
  const isProxy = !!implementation;

  // ===== Get implementation bytecode (where real logic lives) =====
  let implCode = proxyCode;
  if (isProxy && implementation) {
    const code = await client.getCode({
      address: implementation as `0x${string}`,
    });
    if (code && code !== "0x") {
      implCode = code;
    }
  }

  const targetAddress = isProxy
    ? (implementation as `0x${string}`)
    : address;

  const capabilitySet = new Set<string>();
  const riskFlags: string[] = [];

  // ===== Bytecode-based capability detection =====

  // Ownable: has owner() selector
  const hasOwner = bytecodeHas(implCode, "owner()");

  // Pausable: has paused() and pause()/unpause()
  const hasPaused = bytecodeHas(implCode, "paused()");
  const hasPause = bytecodeHas(implCode, "pause()");

  // Mintable: has mint(address,uint256) or mint(address,uint256) variants
  const hasMint =
    bytecodeHas(implCode, "mint(address,uint256)") ||
    bytecodeHas(implCode, "mint(address,uint256,bytes)");

  // Burnable: has burn(uint256) or burnFrom(address,uint256)
  const hasBurn =
    bytecodeHas(implCode, "burn(uint256)") ||
    bytecodeHas(implCode, "burnFrom(address,uint256)");

  // AccessControl: has DEFAULT_ADMIN_ROLE() and hasRole(bytes32,address)
  const hasDefaultAdminRole = bytecodeHas(implCode, "DEFAULT_ADMIN_ROLE()");
  const hasRoleCheck = bytecodeHas(implCode, "hasRole(bytes32,address)");

  // Upgradeable: proxy pattern OR has upgradeTo(address)
  const hasUpgradeTo =
    bytecodeHas(proxyCode, "upgradeTo(address)") ||
    bytecodeHas(implCode, "upgradeTo(address)") ||
    bytecodeHas(implCode, "upgradeToAndCall(address,bytes)");

  // ===== Build capabilities =====

  let owner: string | null = null;
  let ownerType: OwnerType = "NONE";
  let isRenounced = false;
  let hasTimelock = false;
  let adminRoleCount = 0;

  let confirmedAccessControl = false;

  if (hasDefaultAdminRole || hasRoleCheck) {
    try {
      await client.readContract({
        address: targetAddress,
        abi: [{
          name: "DEFAULT_ADMIN_ROLE",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "bytes32" }],
        }],
        functionName: "DEFAULT_ADMIN_ROLE",
      });
      confirmedAccessControl = true;
    } catch {
      confirmedAccessControl = false;
    }
  }

  if (confirmedAccessControl) {
    try {
      const adminRole = await client.readContract({
        address: targetAddress,
        abi: [{
          name: "DEFAULT_ADMIN_ROLE",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "bytes32" }],
        }],
        functionName: "DEFAULT_ADMIN_ROLE",
      });
  
      const admin = await client.readContract({
        address: targetAddress,
        abi: [{
          name: "getRoleMemberCount",
          type: "function",
          stateMutability: "view",
          inputs: [{ type: "bytes32" }],
          outputs: [{ type: "uint256" }],
        }],
        functionName: "getRoleMemberCount",
        args: [adminRole],
      });
  
      adminRoleCount = Number(admin);
    } catch {
      adminRoleCount = 0;
    }
  }

  if (hasOwner) {
    capabilitySet.add("Ownable");
  }

  if (hasPaused || hasPause) {
    capabilitySet.add("Pausable");
    riskFlags.push("PAUSABLE_CONTRACT");
  }

  if (hasMint) {
    capabilitySet.add("Mintable");
    riskFlags.push("MINT_FUNCTION_PRESENT");
  }

  if (hasBurn) {
    capabilitySet.add("Burnable");
  }

  const hasUpgrade = isProxy || hasUpgradeTo;

  if (hasUpgrade) {
    capabilitySet.add("Upgradeable");
    riskFlags.push("PROXY_PATTERN_DETECTED");
  }

  const capabilities = Array.from(capabilitySet);

  // ===== Owner probing (only if Ownable detected) =====

  if (hasOwner) {
    owner = await tryReadOwner(client, targetAddress);
  
    if (!owner || owner === zeroAddress) {
      isRenounced = true;
      ownerType = "NONE";
      riskFlags.push("OWNERSHIP_RENOUNCED");
    } else {
      const code = await client.getCode({
        address: owner as `0x${string}`,
      });
  
      const isContractOwner = !!code && code !== "0x";
  
      if (!isContractOwner) {
        ownerType = "EOA";
      } else {
        // Try Timelock detection
        try {
          await client.readContract({
            address: owner as `0x${string}`,
            abi: [{
              name: "getMinDelay",
              type: "function",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "uint256" }],
            }],
            functionName: "getMinDelay",
          });

          ownerType = "TIMELOCK";
          hasTimelock = true;
        } catch {
          // Try Safe detection
          try {
            await client.readContract({
              address: owner as `0x${string}`,
              abi: [{
                name: "getThreshold",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [{ type: "uint256" }],
              }],
              functionName: "getThreshold",
            });
    
            ownerType = "SAFE_MULTISIG";
          } catch {
            ownerType = "UNKNOWN_CONTRACT";
          }
        }
      }
  
      riskFlags.push("OWNER_ACTIVE");
    }
  }

  const signals: PrivilegeSignals = {
    hasMint,
    hasBurn,
    hasPause: hasPaused || hasPause,
    hasAccessControl: confirmedAccessControl,
    hasUpgrade,
  
    hasSupplyCap: false,
    hasBlacklist: false,
    hasTradingToggle: false,
  };

  return {
    address,
    isContract: true,
    isProxy,
    implementation: implementation ?? undefined,
  
    owner,
    ownerType,
    isRenounced,
    hasTimelock,
    adminRoleCount,
  
    capabilities,
    signals,
    riskFlags,
  };
}
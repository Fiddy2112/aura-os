import { getAddress, zeroAddress, zeroHash, keccak256, toHex, stringToHex } from "viem";
import { getPublicClient } from "../blockchain/chains.js";

const IMPLEMENTATION_SLOT =
  "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

export interface PrivilegeResult {
  address: string;
  isContract: boolean; 
  owner: string | null;
  isRenounced: boolean;
  isProxy: boolean;
  implementation?: string;
  capabilities: string[];
  ownerType: "EOA" | "CONTRACT" | "MULTISIG" | null;
  signals: {
    hasMint: boolean;
    hasBurn: boolean;
    hasPause: boolean;
    hasAccessControl: boolean;
    hasUpgrade: boolean;
  };
  riskFlags: string[];
}

// Compute 4-byte selector from function signature
function selector(sig: string): string {
    return keccak256(stringToHex(sig)).slice(0, 10); // "0x" + 8 hex chars
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
  const proxyCode = await client.getCode({ address });
  const isContract = proxyCode && proxyCode !== "0x";
  if (!isContract) {
    return {
      address,
      isContract: false,
      owner: null,
      isRenounced: false,
      isProxy: false,
      implementation: undefined,
      capabilities: [],
      ownerType: null,
      riskFlags: [],
      signals: {
        hasMint: false,
        hasBurn: false,
        hasPause: false,
        hasAccessControl: false,
        hasUpgrade: false,
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

  const capabilities: string[] = [];
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

  if (isProxy || hasUpgradeTo) {
    capabilities.push("Upgradeable");
    riskFlags.push("PROXY_PATTERN_DETECTED");
  }

  if (confirmedAccessControl) {
    capabilities.push("AccessControl");
    const index = capabilities.indexOf("Ownable");
    if (index !== -1) {
      capabilities.splice(index, 1);
    }
  }

  if (hasOwner && !confirmedAccessControl) {
    capabilities.push("Ownable");
  }

  if (hasPaused || hasPause) {
    capabilities.push("Pausable");
    riskFlags.push("PAUSABLE_CONTRACT");
  }

  if (hasMint) {
    capabilities.push("Mintable");
    riskFlags.push("MINT_FUNCTION_PRESENT");
  }

  if (hasBurn) {
    capabilities.push("Burnable");
  }

  // ===== Owner probing (only if Ownable detected) =====
  let owner: string | null = null;
  let ownerType : "EOA" | "CONTRACT" | "MULTISIG" | null = null;
  let isRenounced = false;

  if (hasOwner) {
    owner = await tryReadOwner(client, targetAddress);
  
    if (!owner || owner === zeroAddress) {
      isRenounced = true;
      riskFlags.push("OWNERSHIP_RENOUNCED");
    } else {
      riskFlags.push("OWNER_ACTIVE");
  
      const code = await client.getCode({
        address: owner as `0x${string}`,
      });
  
      ownerType = (!code || code === "0x") ? "EOA" : "CONTRACT";
    }
  }

  const signals: PrivilegeResult["signals"] = {
    hasMint,
    hasBurn,
    hasPause: hasPaused || hasPause,
    hasAccessControl: confirmedAccessControl,
    hasUpgrade: isProxy || hasUpgradeTo,
  };

  return {
    address,
    isContract: true,
    owner,
    isRenounced,
    isProxy,
    implementation: implementation ?? undefined,
    capabilities,
    ownerType,
    riskFlags,
    signals
  };
}
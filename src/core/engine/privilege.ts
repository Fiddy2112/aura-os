// import { getAddress, zeroAddress, zeroHash } from "viem";
// import { getPublicClient } from "../blockchain/chains.js";
// import { KNOWN_SELECTORS } from "./selector-db.js";

// const IMPLEMENTATION_SLOT =
//   "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

// export interface PrivilegeResult {
//     address: string;
//     selectors: string[];
//     owner: string | null;
//     isRenounced: boolean;
//     detectedFunctions: string[];
//     isProxy: boolean;
//     implementation?: string;
//     riskFlags: string[];
// }

// function extractSelectors(bytecode: string): string[] {
//   const selectors: string[] = [];
//   const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;

//   for (let i = 0; i <= hex.length - 8; i += 2) {
//     const possible = "0x" + hex.slice(i, i + 8);
//     if (KNOWN_SELECTORS[possible]) {
//       selectors.push(possible);
//     }
//   }

//   return [...new Set(selectors)];
// }

// export async function analyzePrivileges(
//   address: `0x${string}`
// ): Promise<PrivilegeResult> {
//   const client = getPublicClient();

//   const code = await client.getCode({ address });

//   if (!code || code === "0x") {
//     throw new Error("No contract bytecode found at this address");
//   }

//   const selectors = extractSelectors(code);

//   const detectedFunctions = selectors
//     .map((s) => KNOWN_SELECTORS[s])
//     .filter((name): name is string => !!name);

//   // owner detection
//   let owner: string | null = null;
//   let isRenounced = false;

//   if(detectedFunctions.includes("owner()")){
//     try{
//         owner = await client.readContract({
//             address,
//             abi:[{
//                 name:"owner",
//                 type: "function",
//                 stateMutability:"view",
//                 inputs: [],
//                 outputs: [{type:"address"}]
//             }],
//             functionName: "owner",
//         }) as string;

//         if(!owner || owner === zeroAddress){
//             isRenounced = true;
//         }
//     }catch{
//         owner = null;
//     }
//   }


//   // Proxy detection (EIP-1967)
//   const implStorage = await client.getStorageAt({
//     address,
//     slot: IMPLEMENTATION_SLOT,
//   });

//   let isProxy = false;
//   let implementation: string | undefined;

//   if (implStorage && implStorage !== zeroHash && implStorage.length >= 66) {
//     const addressHex = implStorage.slice(-40);
//     if (addressHex && addressHex.length === 40) {
//       isProxy = true;
//       implementation = getAddress(`0x${addressHex}` as `0x${string}`);
//     }
//   }

//   const riskFlags: string[] = [];

//   if (detectedFunctions.includes("mint(address,uint256)")) {
//     riskFlags.push("UNLIMITED_MINT_CAPABILITY");
//   }

//   if (detectedFunctions.includes("upgradeTo(address)")) {
//     riskFlags.push("UPGRADEABLE_CONTRACT");
//   }

//   if (detectedFunctions.includes("pause()")) {
//     riskFlags.push("PAUSABLE_CONTRACT");
//   }

//   if (isProxy) {
//     riskFlags.push("PROXY_PATTERN_DETECTED");
//   }

//   if (owner && !isRenounced) {
//     riskFlags.push("OWNER_ACTIVE");
//   }

//   if (isRenounced) {
//     riskFlags.push("OWNERSHIP_RENOUNCED");
//   }

//   return {
//     address,
//     selectors,
//     owner,
//     isRenounced,
//     isProxy,
//     implementation,
//     detectedFunctions,
//     riskFlags,
//   };
// }

import { getAddress, zeroAddress, zeroHash } from "viem";
import { getPublicClient } from "../blockchain/chains.js";

const IMPLEMENTATION_SLOT =
  "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

export interface PrivilegeResult {
  address: string;
  owner: string | null;
  isRenounced: boolean;
  isProxy: boolean;
  implementation?: string;
  capabilities: string[];
  riskFlags: string[];
}

async function detectProxy(client: any, address: `0x${string}`) {
  const implStorage = await client.getStorageAt({
    address,
    slot: IMPLEMENTATION_SLOT,
  });

  if (
    implStorage &&
    implStorage !== zeroHash &&
    implStorage.length >= 66
  ) {
    const addressHex = implStorage.slice(-40);
    if (addressHex.length === 40) {
      return getAddress(`0x${addressHex}` as `0x${string}`);
    }
  }

  return null;
}

export async function analyzePrivileges(
  address: `0x${string}`
): Promise<PrivilegeResult> {
  const client = getPublicClient();

  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    throw new Error("No contract bytecode found at this address");
  }

  // ===== Proxy detection =====
  const implementation = await detectProxy(client, address);
  const isProxy = !!implementation;

  const targetAddress = isProxy
    ? (implementation as `0x${string}`)
    : address;

  const capabilities: string[] = [];
  const riskFlags: string[] = [];

  // ===== Owner probing =====
  let owner: string | null = null;
  let isRenounced = false;

  try {
    owner = (await client.readContract({
      address: targetAddress,
      abi: [{
        name: "owner",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "address" }],
      }],
      functionName: "owner",
    })) as string;

    capabilities.push("Ownable");

    if (!owner || owner === zeroAddress) {
      isRenounced = true;
      riskFlags.push("OWNERSHIP_RENOUNCED");
    } else {
      riskFlags.push("OWNER_ACTIVE");
    }
  } catch {}

  // ===== Pausable probing =====
  try {
    await client.readContract({
      address: targetAddress,
      abi: [{
        name: "paused",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "bool" }],
      }],
      functionName: "paused",
    });

    capabilities.push("Pausable");
    riskFlags.push("PAUSABLE_CONTRACT");
  } catch {}

  // ===== Mint probing =====
  try {
    await client.readContract({
      address: targetAddress,
      abi: [{
        name: "mint",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { type: "address" },
          { type: "uint256" }
        ],
        outputs: [],
      }],
      functionName: "mint",
      args: [address, 0n],
    });

    capabilities.push("Mintable");
    riskFlags.push("UNLIMITED_MINT_CAPABILITY");
  } catch {}

  // ===== AccessControl probing =====
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

    capabilities.push("AccessControl");
    riskFlags.push("ROLE_BASED_ACCESS_CONTROL");
  } catch {}

  // ===== Proxy flag =====
  if (isProxy) {
    riskFlags.push("PROXY_PATTERN_DETECTED");
  }

  return {
    address,
    owner,
    isRenounced,
    isProxy,
    implementation: implementation ?? undefined,
    capabilities,
    riskFlags,
  };
}
import { getAddress, zeroHash, keccak256, type Hex } from "viem";
import { getCurrentChain, getPublicClient } from "../blockchain/chains.js";
import { safeRpcCall } from "../utils/helpers.js";

  export interface ContractInfo {
    address: `0x${string}`;
    chain: string;
  
    // Basic
    isContract: boolean;
    codeSize: number;
    bytecodeHash: Hex | null;

    // Token
    token?: {
        name?: string;
        symbol?: string;
        decimals?: number;
        totalSupply?: bigint;
      }
  
    // Proxy
    isProxy: boolean;
    proxyType: "EIP1967" | "MinimalProxy" | "Unknown" | null;
    implementation?: string;
  
    // Structural
    hasDelegateCall: boolean;
    hasSelfDestruct: boolean;
    hasCreate: boolean;
    hasCreate2: boolean;
  
    // Fingerprint
    functionSelectors: string[];
    selectorCount: number;
  
    // Bytecode metrics
    uniqueOpcodeCount: number;
  
    // ERC type
    standards: {
      ERC20: boolean;
      ERC20Metadata: boolean;
      ERC20Permit: boolean;
      ERC721: boolean;
      ERC1155: boolean;
    };
  
    stablecoinProfile?: {
      isStablecoinLike: boolean;
      hasBlacklist: boolean;
      hasFreeze: boolean;
      hasWipe: boolean;
      mintAuthorityCentralized: boolean;
    };

    antiWhaleProfile?: {
      hasMaxTxFunction: boolean;
      hasMaxWalletFunction: boolean;
      hasTradingToggle: boolean;
      isTransferRestricted: boolean;
    };

    deployment?: {
      blockNumber: bigint;
      timestamp: number;
      ageInDays: number;
    };
  }

  // helpers
  const IMPLEMENTATION_SLOT = "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

  function analyzeStructural(runtime:string){
    return {
        hasDelegateCall: runtime.includes("f4"),
        hasSelfDestruct: runtime.includes("ff"),
        hasCreate: runtime.includes("f0"),
        hasCreate2: runtime.includes("f5"),
    };
  }

  function extractSelectors(runtime:string):string[]{
    const selectorRegex = /63([0-9a-f]{8})/g;
    const selectors = new Set<string>();

    let match;
    while((match = selectorRegex.exec(runtime)) !== null){
        selectors.add("0x" + match[1]);
    }

    return Array.from(selectors);
  }

  function countUniqueOpcodes(runtime: string):number{
    const bytes = runtime.match(/../g) ?? [];
    return new Set(bytes).size;
  }

  async function detectTokenIdentity(client: any, address: `0x${string}`) {
  const result: any = {};

  try {
    result.name = await client.readContract({
      address,
      abi: [{ name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
      functionName: "name",
    });
  } catch {}

  try {
    result.symbol = await client.readContract({
      address,
      abi: [{ name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
      functionName: "symbol",
    });
  } catch {}

  try {
    result.decimals = await client.readContract({
      address,
      abi: [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }],
      functionName: "decimals",
    });
  } catch {}

  try {
    result.totalSupply = await client.readContract({
      address,
      abi: [{ name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
      functionName: "totalSupply",
    });
  } catch {}

  if (Object.keys(result).length === 0) return null;

  return result;
}

  // ERC Detection
  
  async function detectERCStandards(client:any, address: `0x${string}`){
    let ERC20 = false;
    let ERC20Metadata = false;
    let ERC20Permit = false;
    let ERC721 = false;
    let ERC1155 = false;

    try{
        await client.readContract({
            address,
            abi:[{
                name: "totalSupply",
                type: "function",
                stateMutability: "view",
                inputs:[],
                outputs: [{ type: "uint256"}]
            }],
            functionName: "totalSupply",
        });

        await client.readContract({
            address,
            abi:[{
                name: "balanceOf",
                type: "function",
                stateMutability: "view",
                inputs: [{type: "address"}],
                outputs: [{type: "uint256"}]
            }],
            functionName: "balanceOf",
            args: ["0x0000000000000000000000000000000000000000"],
        });

        ERC20 = true;
    }catch{
        ERC20 = false;
    }

    // ERC20 Metadata
    if(ERC20){
        try{
            await client.readContract({
                address,
                abi:[{
                    name:"name",
                    type: "function",
                    stateMutability: "view",
                    inputs: [],
                    outputs: [{type: "string"}]
                }],
                functionName: "name",
            });

            ERC20Metadata = true;
        }catch{
            ERC20Metadata = false;
        }
    }

    // ERC20 Permit
    if(ERC20){
        try{
            await client.readContract({
                address,
                abi:[{
                    name: "DOMAIN_SEPARATOR",
                    type: "function",
                    stateMutability: "view",
                    inputs:[],
                    outputs: [{type: "bytes32"}]
                }],
                functionName: "DOMAIN_SEPARATOR"
            });

            ERC20Permit = true;
        }catch{
            ERC20Permit = false;
        }
    }

    // ERC721
    try{
        await client.readContract({
            address,
            abi:[{
                name:"ownerOf",
                type: "function",
                stateMutability: "view",
                inputs:[{type: "uint256"}],
                outputs:[{type: "address"}]
            }],
            functionName: "ownerOf",
            args: [1n]
        });

        ERC721 = true;
    }catch{
        ERC721 = false;
    }

    // ERC1155
    try{
        await client.readContract({
            address,
            abi:[{
                name:"balanceOf",
                type: "function",
                stateMutability: "view",
                inputs:[{type:"address"}, {type: "uint256"}],
                outputs: [{ type: "uint256" }]
            }],
            functionName: "balanceOf",
            args: [
                "0x0000000000000000000000000000000000000000",
                0n,
            ],
        });

        ERC1155 = true;
    }catch{
        ERC1155 = false;
    }
    

    return {
        ERC20,
        ERC20Metadata,
        ERC20Permit,
        ERC721,
        ERC1155,
    };
  }

  function buildAntiWhaleProfile(runtime: string) {
    const hasMaxTxFunction =
      runtime.includes("6d61785478") || // hex "maxTx"
      runtime.includes("6d61785478416d6f756e74"); // "maxTxAmount"
  
    const hasMaxWalletFunction =
      runtime.includes("6d617857616c6c6574") || // "maxWallet"
      runtime.includes("5f6d617857616c6c6574"); // "_maxWallet"
  
    const hasTradingToggle =
      runtime.includes("74726164696e67") || // "trading"
      runtime.includes("656e61626c6564");   // "enabled"
  
    const isTransferRestricted =
      hasMaxTxFunction || hasMaxWalletFunction;
  
    return {
      hasMaxTxFunction,
      hasMaxWalletFunction,
      hasTradingToggle,
      isTransferRestricted,
    };
  }

  function buildStablecoinProfile(
    standards: ContractInfo["standards"],
    runtime: string
  ): ContractInfo["stablecoinProfile"] {
    const hasBlacklist = runtime.includes("blacklist") || runtime.includes("isblacklisted");

    const hasFreeze = runtime.includes("freeze") || runtime.includes("unfreeze");

    const hasWipe = runtime.includes("wipe") || runtime.includes("confiscate");

    const mintAuthorityCentralized = standards.ERC20 && runtime.includes("mint");

    const score = (standards.ERC20 ? 1 : 0) + (mintAuthorityCentralized ? 1 : 0) + (hasBlacklist ? 1 : 0) + (hasFreeze ? 1 : 0);

    return {
        isStablecoinLike : score >= 3,
        hasBlacklist,
        hasFreeze,
        hasWipe,
        mintAuthorityCentralized,
    };
  }

  async function findDeploymentBlock(client:any, address: `0x${string}`): Promise<bigint | null>{
    const latestBlock = await client.getBlockNumber();

    let low = 0n;
    let high = latestBlock;
    let found: bigint | null = null;

    while(low <= high){
      const mid = (low + high) / 2n;

      const code = await client.getCode({
        address,
        blockNumber: mid,
      });

      const exists = code && code !== "0x";

      if(exists){
        found = mid;
        high = mid -1n;
      }else{
        low = mid + 1n;
      }
    }

    return found;
  }

  async function buildDeploymentInfo(client:any, address: `0x${string}`){
    const blockNumber = await findDeploymentBlock(client, address);

    if(!blockNumber) return undefined;

    const block = await client.getBlock({blockNumber});

    const timestamp = Number(block.timestamp);
    const now = Math.floor(Date.now() / 1000);
    const ageInDays = Math.floor((now - timestamp) / 86400); //86.400s -> 60s x 60m x 24hr -> 1 days
    
    return {
      blockNumber,
      timestamp,
      ageInDays,
    };
  }

export async function getContractInfo(address: `0x${string}`): Promise<ContractInfo> {
    const client = getPublicClient();
    const chain = getCurrentChain();
    const code = await safeRpcCall(() =>
      client.getCode({ address })
    );
    const isContract = !!code && code !== "0x";
    
    if(!isContract){
        return {
            address,
            chain: chain.name,
            isContract: false,
            codeSize: 0,
            bytecodeHash: null,
            isProxy: false,
            proxyType: null,
            implementation: undefined,
            hasDelegateCall: false,
            hasSelfDestruct: false,
            hasCreate: false,
            hasCreate2: false,
            functionSelectors: [],
            selectorCount: 0,
            uniqueOpcodeCount: 0,
            standards: {
                ERC20: false,
                ERC20Metadata: false,
                ERC20Permit: false,
                ERC721: false,
                ERC1155: false,
            },
        };
    }

    const runtime = code.slice(2).toLowerCase();

    // Proxy Detection (EIP1976)
    let isProxy = false;
    let proxyType: ContractInfo["proxyType"] = null;
    let implementation: string | undefined;
    let tokenInfo = undefined;

    try{
        const implStorage = await client.getStorageAt({
            address,
            slot: IMPLEMENTATION_SLOT,
        });

        if(implStorage && implStorage !== zeroHash && implStorage.length >= 66){
            const addressHex = implStorage.slice(-40);
            if(addressHex.length === 40){
                isProxy = true;
                proxyType = "EIP1967",
                implementation = getAddress(`0x${addressHex}` as `0x${string}`);
            }
        }
    }catch{}

    const targetAddress = isProxy && implementation ? (implementation as `0x${string}`) : address;

    const structural = analyzeStructural(runtime);
    const selectors = extractSelectors(runtime);
    const uniqueOpcodeCount = countUniqueOpcodes(runtime);

    const standards = await detectERCStandards(client,  address);
    const stablecoinProfile  = buildStablecoinProfile(standards, runtime);
    const antiWhaleProfile = buildAntiWhaleProfile(runtime);

    if (standards.ERC20) {
        tokenInfo = await detectTokenIdentity(client, address);
    }

    const deployment = await buildDeploymentInfo(client, address);

    return {
        address,
        chain: chain.name,
        token: tokenInfo ?? undefined,
        isContract: true,
        codeSize: (runtime.length) / 2,
        bytecodeHash: keccak256(code),
        isProxy,
        proxyType,
        implementation,
        hasDelegateCall: structural.hasDelegateCall,
        hasSelfDestruct: structural.hasSelfDestruct,
        hasCreate: structural.hasCreate,
        hasCreate2: structural.hasCreate2,
        functionSelectors: selectors,
        selectorCount: selectors.length,
        uniqueOpcodeCount,
        standards,
        stablecoinProfile,
        antiWhaleProfile,
        deployment
    };
}

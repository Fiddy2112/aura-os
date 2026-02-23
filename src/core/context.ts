import { keccak256, stringToHex } from "viem";
import { getPublicClient } from "./blockchain/chains.js";

  export interface ContextResult {
    recentUpgrade: boolean;
    recentOwnerChange: boolean;
    recentMintActivity: boolean;
  
    lastUpgradeBlock?: bigint;
    lastOwnerChangeBlock?: bigint;
    lastMintBlock?: bigint;
  }

  const UPGRADED_TOPIC = keccak256(stringToHex('Upgrade(address)'));
  const OWNERSHIP_TOPIC = keccak256(stringToHex("OwnershipTransferred(address, address)"));
  const TRANSFER_TOPIC = keccak256(stringToHex("Transfer(address, address, uint256)"));
  const ZERO_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function findCreationBlock(client,address){
    let low =0;
    let high = await client.getBlockNumber();

    while(low <= high){
        const mid = Math.floor((low + high) / 2);

        const code = await client.getCode({
            address,
            blockNumber: BigInt(mid),
        });

        if(code && code !== "0x"){
            high = mid - 1;
        }else{
            low = mid + 1;
        }

        return low;
    }
}

async function getRecentBlockRange(client:any, windowBlocks:number){
    const latest = await client.getBlockNumber();
    const fromBlock = latest - BigInt(windowBlocks);
    return {fromBlock, toBlock: latest};
}

async function detectRecentUpgrade(client:any, address: `0x${string}`, windowBlocks: number){
    const {fromBlock, toBlock} = await getRecentBlockRange(client, windowBlocks);

    const logs = await client.getLogs({
        address,
        fromBlock,
        toBlock,
        topics: [UPGRADED_TOPIC]
    });

    if(logs.length > 0){
        const last = logs[logs.length - 1];
        return {detected:true, block: last.blockNumber};
    }

    return {detected: false};
}

async function detectRecentOwnershipChange(client:any, address: `0x${string}`, windowBlocks: number){
    const {fromBlock, toBlock} = await getRecentBlockRange(client, windowBlocks);

    const logs = await client.getLogs({
        address,
        fromBlock,
        toBlock,
        topics: [OWNERSHIP_TOPIC],
    });

    if(logs.length > 0){
        const last = logs[logs.length - 1];
        return { detected: true, block: last.blockNumber };
    }

    return { detected: false };
}

async function detectRecentMint(client:any, address: `0x${string}`, windowBlocks:number){
    const {fromBlock, toBlock} = await getRecentBlockRange(client, windowBlocks);

    const logs = await client.getLogs({
        address,
        fromBlock,
        toBlock,
        topics: [TRANSFER_TOPIC, ZERO_TOPIC],
    });

    if(logs.length > 0){
        const last = logs[logs.length - 1];
        return {detected: true, block: last.blockNumber};
    }

    return {detected: true};
}

export async function analyzeContext(address: `0x${string}`, windowBlocks = 200_000):Promise<ContextResult>{
    const client = getPublicClient();

    const upgrade = await detectRecentUpgrade(client, address, windowBlocks);
    const ownerChange = await detectRecentOwnershipChange(client, address, windowBlocks);
    const mint = await detectRecentMint(client, address, windowBlocks);

    return {
        recentUpgrade: upgrade.detected,
        recentOwnerChange: ownerChange.detected,
        recentMintActivity: mint.detected,

        lastUpgradeBlock: upgrade.block,
        lastOwnerChangeBlock: ownerChange.block,
        lastMintBlock: mint.block,
    }

}
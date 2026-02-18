import { getAddress, zeroHash, keccak256, type Hex } from "viem";
import { getCurrentChain, getPublicClient } from "../blockchain/chains.js";

export interface ContractInfo {
    address: `0x${string}`;
    isContract: boolean;
    chain: string;
    codeSize: number;
    isProxy: boolean;
    implementation?: string;
    bytecodeHash: Hex | null;
}

export async function getContractInfo(address: `0x${string}`): Promise<ContractInfo> {
    const client = getPublicClient();
    const chain = getCurrentChain();
    const code = await client.getCode({
        address,
    });

    const isContract = code && code !== '0x';
    const bytecodeHash = code && code !== '0x' ? keccak256(code) : null;

    let isProxy = false;
    let implementation: string | undefined;

    const IMPLEMENTATION_SLOT =
        "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

    try {
        const implStorage = await client.getStorageAt({
            address,
            slot: IMPLEMENTATION_SLOT,
        });

        if (implStorage && implStorage !== zeroHash && implStorage.length >= 66) {
            // Extract address from last 20 bytes (40 hex chars) of storage slot
            // Storage slot is 32 bytes (64 hex chars + "0x" prefix = 66 chars)
            // Address is in the last 20 bytes, so we take the last 40 hex chars
            const addressHex = implStorage.slice(-40);
            if (addressHex && addressHex.length === 40) {
                isProxy = true;
                implementation = getAddress(`0x${addressHex}` as `0x${string}`);
            }
        }
    } catch (err) {
        // Silently fail proxy detection - not all contracts are proxies
        // Errors are expected for non-proxy contracts or invalid storage access
    }

    return {
        address,
        isContract: !!isContract,
        chain: chain.name,
        codeSize: code && code !== '0x' ? (code.length - 2) / 2 : 0,
        isProxy,
        implementation,
        bytecodeHash,
    };
}
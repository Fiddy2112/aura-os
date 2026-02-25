import { ContractInfo, getContractInfo } from "./info.js";
import { analyzePrivileges, PrivilegeResult } from "./privilege.js";
import { computeRisk, RiskResult } from "./risk.js";

export interface ContractContext{
    info: ContractInfo;
    privilege: PrivilegeResult;
    risk: RiskResult;
}

export async function buildContext(address: `0x${string}`):Promise<ContractContext>{
    const info = await getContractInfo(address);
    const privilege = await analyzePrivileges(address);
    const risk = await computeRisk(privilege);

    return {
        info,
        privilege,
        risk,
    }
}
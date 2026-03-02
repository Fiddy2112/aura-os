import { ContractContext } from "./context.js";

export type ContractCategory = 
  | "Immutable Token" 
  | "Upgradeable Token" 
  | "Governance Controlled" 
  | "Centralized Mint Authority" 
  | "Censorship Enabled" 
  | "High Risk Pattern"
  | "Standard Token" 
  | "Unknown Pattern";

export interface ClassificationResult {
    verdict: string;
    category: ContractCategory;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence: "LOW" | "MEDIUM" | "HIGH";
}

export function classifyContract(ctx: ContractContext): ClassificationResult {
    const { info, privilege, risk } = ctx;

    // Default state
    let category: ContractCategory = "Unknown Pattern";
    let verdict = "Standard Contract Pattern";
    let confidence: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";

    // 1. Foundation: Establish basic pattern
    if (privilege.isRenounced && !privilege.signals.hasUpgrade && !privilege.signals.hasMint) {
        category = "Immutable Token";
        verdict = "Immutable ERC Token (Ownership Renounced)";
        confidence = "HIGH";
    } else if (privilege.signals.hasUpgrade) {
        category = "Upgradeable Token";
        verdict = "Upgradeable Smart Contract";
        confidence = privilege.hasTimelock ? "HIGH" : "MEDIUM";
    } else if (privilege.ownerType === "EOA") {
        category = "Standard Token";
        verdict = "Owner-Controlled Token";
    }

    // 2. Intelligence Overlays: High-priority security findings "Win" the verdict
    
    // Governance Mitigation (Good sign, but lower priority than finding threats)
    if (privilege.ownerType === "SAFE_MULTISIG" || privilege.ownerType === "TIMELOCK") {
        category = "Governance Controlled";
        verdict = "Governed by Multisig / Timelock";
        confidence = "HIGH";
    }

    // Centralization Threat (Higher priority)
    if (privilege.signals.hasMint && privilege.ownerType === "EOA") {
        category = "Centralized Mint Authority";
        verdict = "Infinite Mint Authority held by EOA";
        confidence = "HIGH";
    }

    // Censorship Threat (Highest priority)
    if (info.stablecoinProfile?.hasBlacklist || privilege.signals.hasBlacklist) {
        category = "Censorship Enabled";
        verdict = "Censorship (Blacklist/Freeze) Capabilities Detected";
        confidence = info.stablecoinProfile ? "HIGH" : "MEDIUM";
    }

    // High Risk Override
    if (risk.level === "CRITICAL") {
        category = "High Risk Pattern";
        verdict = risk.reasons[0] || "Critical Security Risks Detected";
        confidence = "HIGH";
    }

    return {
        verdict,
        category,
        severity: risk.level,
        confidence
    }
}
import { PrivilegeResult } from "./privilege.js";

export interface RiskResult  {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    reasons: string[];
}

export function computeRisk(priv: PrivilegeResult):RiskResult {
    let score = 0;
    const reasons: string[] = [];

    if (!priv.isContract) {
        return {
          score: 0,
          level: "LOW",
          reasons: ["Address is EOA (not a smart contract)"],
        };
    }

    const {
        signals,
        ownerType,
        owner,
        isRenounced,
        isProxy,
    }= priv;

    // ===== Upgradeable =====
    if (signals.hasUpgrade || isProxy) {
        score += 20;
        reasons.push("Upgradeable contract");
    
        if (owner && !isRenounced) {
          score += 15;
          reasons.push("Upgradeable + active owner");
        }
    
        if (ownerType === "EOA") {
          score += 10;
          reasons.push("Upgradeable controlled by EOA");
        }
    }

    // ===== Mint =====
    if (signals.hasMint) {
        score += 15;
        reasons.push("Mint function present");

        if (ownerType === "EOA") {
        score += 10;
        reasons.push("Mint controlled by EOA");
        }

        if (isRenounced) {
        score -= 5;
        reasons.push("Mint but ownership renounced");
        }
    }

    // ===== Pausable =====
    if (signals.hasPause) {
        score += 10;
        reasons.push("Pausable contract");

        if (owner && !isRenounced) {
        score += 5;
        reasons.push("Pause controlled by active owner");
        }
    }

    // ===== AccessControl =====
    if (signals.hasAccessControl) {
        score += 10;
        reasons.push("Role-based access control");

        if (ownerType === "CONTRACT") {
        score -= 5;
        reasons.push("Access control managed by contract");
        }
    }

    // ===== Ownership mitigation =====
    if (isRenounced) {
        score -= 15;
        reasons.push("Ownership renounced");
    }

    if (ownerType === "CONTRACT") {
        score -= 10;
        reasons.push("Owner is contract (likely multisig)");
    }

    // clamp
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let level: RiskResult["level"];

    if (score <= 25) level = "LOW";
    else if (score <= 50) level = "MEDIUM";
    else if (score <= 75) level = "HIGH";
    else level = "CRITICAL";

    return { score, level, reasons };
}
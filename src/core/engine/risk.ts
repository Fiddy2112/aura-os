import { PrivilegeResult } from "./privilege.js";

  export interface RiskBreakdown {
    upgrade: number;
    supply: number;
    control: number;
    operational: number;
  }

  export interface RiskResult {
    score: number;
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    breakdown: RiskBreakdown;
    reasons: string[];
  }

  function clamp(value: number) {
    return Math.max(0, Math.min(100, value));
  }

  export function computeRisk(priv: PrivilegeResult): RiskResult {
    if (!priv.isContract) {
      return {
        score: 0,
        level: "LOW",
        breakdown: {
          upgrade: 0,
          supply: 0,
          control: 0,
          operational: 0,
        },
        reasons: ["Address is EOA (not a smart contract)"],
      };
    }
  
    const { signals, ownerType, owner, isRenounced, isProxy } = priv;
  
    let upgradeRisk = 0;
    let supplyRisk = 0;
    let controlRisk = 0;
    let operationalRisk = 0;
  
    const reasons: string[] = [];
  
    // ======================
    // UPGRADE RISK
    // ======================
  
    if (signals.hasUpgrade) {
      upgradeRisk += 40;
      reasons.push("Upgradeable contract");
  
      if (ownerType === "EOA") {
        upgradeRisk += 30;
        reasons.push("Upgradeable controlled by EOA");
      }
  
      if (!priv.hasTimelock) {
        upgradeRisk += 20;
        reasons.push("Upgradeable without timelock");
      }
    }
  
    if (isProxy && !signals.hasUpgrade) {
      upgradeRisk += 20;
      reasons.push("Proxy detected but upgrade path unclear");
    }
  
    if (isRenounced) {
      upgradeRisk -= 30;
      reasons.push("Upgrade risk reduced (ownership renounced)");
    }
  
    upgradeRisk = clamp(upgradeRisk);
  
    // ======================
    // SUPPLY RISK
    // ======================
  
    if (signals.hasMint) {
      supplyRisk += 35;
      reasons.push("Mint function present");
  
      if (!signals.hasSupplyCap) {
        supplyRisk += 25;
        reasons.push("Unlimited mint (no supply cap)");
      }
  
      if (ownerType === "EOA") {
        supplyRisk += 20;
        reasons.push("Mint controlled by EOA");
      }
    }
  
    supplyRisk = clamp(supplyRisk);
  
    // ======================
    // CONTROL RISK
    // ======================
  
    if (ownerType === "EOA") {
      controlRisk += 35;
      reasons.push("Owner is EOA");
    }
  
    if (ownerType === "UNKNOWN_CONTRACT") {
      controlRisk += 25;
      reasons.push("Owner is unknown contract");
    }
  
    if (ownerType === "SAFE_MULTISIG") {
      controlRisk += 10;
      reasons.push("Owner is multisig");
    }
  
    if (signals.hasAccessControl && priv.adminRoleCount === 1) {
      controlRisk += 15;
      reasons.push("Single admin role detected");
    }
  
    if (isRenounced) {
      controlRisk -= 25;
      reasons.push("Ownership renounced");
    }
  
    controlRisk = clamp(controlRisk);
  
    // ======================
    // OPERATIONAL RISK
    // ======================
  
    if (signals.hasPause) {
      operationalRisk += 15;
      reasons.push("Pausable contract");
  
      if (owner && !isRenounced) {
        operationalRisk += 10;
        reasons.push("Pause controlled by active owner");
      }
    }
  
    if (signals.hasBlacklist) {
      operationalRisk += 20;
      reasons.push("Blacklist capability detected");
    }
  
    if (signals.hasTradingToggle) {
      operationalRisk += 15;
      reasons.push("Trading toggle detected");
    }
  
    operationalRisk = clamp(operationalRisk);
  
    // ======================
    // FINAL SCORE
    // ======================
  
    const finalScore = clamp(
      upgradeRisk * 0.35 +
        supplyRisk * 0.30 +
        controlRisk * 0.25 +
        operationalRisk * 0.10
    );
  
    let level: RiskResult["level"];
  
    if (finalScore <= 25) level = "LOW";
    else if (finalScore <= 50) level = "MEDIUM";
    else if (finalScore <= 75) level = "HIGH";
    else level = "CRITICAL";
  
    return {
      score: Math.round(finalScore),
      level,
      breakdown: {
        upgrade: upgradeRisk,
        supply: supplyRisk,
        control: controlRisk,
        operational: operationalRisk,
      },
      reasons,
    };
  }
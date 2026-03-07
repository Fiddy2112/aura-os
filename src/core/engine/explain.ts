import { AIInterpreter } from "../ai/interpreter.js";
import { type RiskResult } from "./risk.js";
import { type PrivilegeResult } from "./privilege.js";
import { type ClassificationResult } from "./classifier.js";

export interface ExplainInput {
  address: string;
  risk: RiskResult;
  privilege: PrivilegeResult;
  classification: ClassificationResult;
}

export async function explainRisk(input: ExplainInput): Promise<string> {
  const { address, risk, privilege, classification } = input;

  const prompt = `You are a smart contract security analyst. Explain the following risk assessment to a developer in plain English.

    Contract: ${address}
    Category: ${classification.category}
    Verdict: ${classification.verdict}
    Risk Level: ${risk.level} (${risk.score}/100)
    Owner Type: ${privilege.ownerType}
    Ownership Renounced: ${privilege.isRenounced}
    Has Timelock: ${privilege.hasTimelock}

    Risk Breakdown:
    - Upgrade Risk: ${risk.breakdown.upgrade}/100
    - Supply Risk: ${risk.breakdown.supply}/100
    - Control Risk: ${risk.breakdown.control}/100
    - Operational Risk: ${risk.breakdown.operational}/100

    Findings:
    ${risk.reasons.map(r => `- ${r}`).join('\n')}

    Capabilities: ${privilege.capabilities.join(', ') || 'None'}

    Write 3-4 sentences explaining:
    1. What the main risk is and why it matters
    2. Who controls the contract and whether that's a concern
    3. One concrete recommendation for users or investors

    Be direct. No markdown. Plain text only.`;

  const interpreter = new AIInterpreter();
  return interpreter.chat(prompt);
}
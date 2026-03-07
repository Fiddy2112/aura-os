import { keccak256, stringToHex } from "viem";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScanFlag {
  id:       string;
  label:    string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface ScanResult {
  address:   string;
  flags:     ScanFlag[];
  riskScore: number;        // 0–100, fast heuristic (not the same as computeRisk)
  selectors: string[];      // detected 4-byte selectors
  codeSize:  number;        // bytes
}

// ── Selector library ──────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<ScanFlag['severity'], number> = {
  CRITICAL: 30, HIGH: 15, MEDIUM: 7, LOW: 2,
};

function sel(sig: string): string {
  return keccak256(stringToHex(sig)).slice(2, 10); // 8 hex chars, no 0x
}

// Pre-computed selector → flag mapping
const SELECTOR_FLAGS: Array<{ selector: string; flag: ScanFlag }> = [
  // Upgrade
  { selector: sel('upgradeTo(address)'),           flag: { id: 'UPGRADEABLE',       label: 'upgradeTo(address) — logic can be replaced',      severity: 'CRITICAL' } },
  { selector: sel('upgradeToAndCall(address,bytes)'), flag: { id: 'UPGRADEABLE_CALL', label: 'upgradeToAndCall — proxy upgrade with call',     severity: 'CRITICAL' } },
  // Mint / burn
  { selector: sel('mint(address,uint256)'),         flag: { id: 'MINT',              label: 'mint(address,uint256) — unlimited supply risk',   severity: 'HIGH'     } },
  { selector: sel('mint(address,uint256,bytes)'),   flag: { id: 'MINT_BYTES',        label: 'mint with bytes — non-standard mint variant',     severity: 'HIGH'     } },
  { selector: sel('burn(address,uint256)'),         flag: { id: 'FORCED_BURN',       label: 'burn(address,uint256) — forced burn capability',  severity: 'HIGH'     } },
  // Pause / freeze
  { selector: sel('pause()'),                       flag: { id: 'PAUSABLE',          label: 'pause() — contract operations can be frozen',     severity: 'MEDIUM'   } },
  { selector: sel('unpause()'),                     flag: { id: 'UNPAUSABLE',        label: 'unpause() — resume capability',                   severity: 'LOW'      } },
  // Ownership
  { selector: sel('transferOwnership(address)'),    flag: { id: 'TRANSFER_OWNER',    label: 'transferOwnership — ownership can be transferred', severity: 'MEDIUM'  } },
  { selector: sel('renounceOwnership()'),           flag: { id: 'RENOUNCE_OWNER',    label: 'renounceOwnership — owner can lock forever',       severity: 'LOW'     } },
  // Blacklist
  { selector: sel('blacklist(address)'),            flag: { id: 'BLACKLIST',         label: 'blacklist(address) — censorship capability',       severity: 'HIGH'    } },
  { selector: sel('addToBlacklist(address)'),       flag: { id: 'BLACKLIST_ADD',     label: 'addToBlacklist — address censorship',              severity: 'HIGH'    } },
  // Selfdestruct / create
  { selector: sel('kill()'),                        flag: { id: 'SELFDESTRUCT',      label: 'kill() — contract can self-destruct',              severity: 'CRITICAL'} },
  // Fee / tax
  { selector: sel('setTax(uint256)'),               flag: { id: 'FEE_TAX',           label: 'setTax — fee manipulation capability',             severity: 'HIGH'    } },
  { selector: sel('setFee(uint256)'),               flag: { id: 'FEE_SET',           label: 'setFee — fee manipulation capability',             severity: 'HIGH'    } },
  // Access control
  { selector: sel('DEFAULT_ADMIN_ROLE()'),          flag: { id: 'ACCESS_CONTROL',    label: 'DEFAULT_ADMIN_ROLE — role-based access control',   severity: 'MEDIUM'  } },
  { selector: sel('grantRole(bytes32,address)'),    flag: { id: 'GRANT_ROLE',        label: 'grantRole — roles can be assigned',                severity: 'MEDIUM'  } },
  // Max TX
  { selector: sel('setMaxTxAmount(uint256)'),       flag: { id: 'MAX_TX',            label: 'setMaxTxAmount — transfer restriction',            severity: 'MEDIUM'  } },
];

// Opcode-based flags (raw bytecode patterns)
const OPCODE_FLAGS: Array<{ hex: string; flag: ScanFlag }> = [
  { hex: 'ff', flag: { id: 'OPCODE_SELFDESTRUCT', label: 'SELFDESTRUCT opcode detected',  severity: 'CRITICAL' } },
  { hex: 'f4', flag: { id: 'OPCODE_DELEGATECALL', label: 'DELEGATECALL opcode detected',  severity: 'MEDIUM'   } },
  { hex: 'f0', flag: { id: 'OPCODE_CREATE',       label: 'CREATE opcode detected',         severity: 'LOW'      } },
  { hex: 'f5', flag: { id: 'OPCODE_CREATE2',      label: 'CREATE2 opcode detected',        severity: 'LOW'      } },
];

// ── Selector extractor (mirrors info.ts logic) ────────────────────────────────

function extractSelectors(runtime: string): string[] {
  const regex = /63([0-9a-f]{8})/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(runtime)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found);
}

// ── Main scanner ──────────────────────────────────────────────────────────────

export function scanContract(address: string, bytecode: string): ScanResult {
  if (!bytecode || bytecode === '0x') {
    return { address, flags: [], riskScore: 0, selectors: [], codeSize: 0 };
  }

  const runtime  = bytecode.startsWith('0x') ? bytecode.slice(2).toLowerCase() : bytecode.toLowerCase();
  const codeSize = runtime.length / 2;
  const flags    = new Map<string, ScanFlag>(); // keyed by id to deduplicate

  // Selector-based checks
  const selectors = extractSelectors(runtime);
  for (const detectedSel of selectors) {
    for (const entry of SELECTOR_FLAGS) {
      if (entry.selector === detectedSel) {
        flags.set(entry.flag.id, entry.flag);
      }
    }
  }

  // Opcode-based checks
  for (const entry of OPCODE_FLAGS) {
    if (runtime.includes(entry.hex) && !flags.has(entry.flag.id)) {
      flags.set(entry.flag.id, entry.flag);
    }
  }

  const flagList = Array.from(flags.values());

  // Heuristic score (capped at 100)
  const rawScore = flagList.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  const riskScore = Math.min(rawScore, 100);

  return {
    address,
    flags:     flagList,
    riskScore,
    selectors: selectors.map(s => `0x${s}`),
    codeSize,
  };
}
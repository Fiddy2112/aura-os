/**
 * selector-db.ts
 *
 * Known 4-byte function selectors → human-readable signatures.
 * Used for display in info/tx/analyze commands.
 *
 * Extend this list as needed — selectors are deterministic:
 *   keccak256("functionName(paramTypes)").slice(0, 4)
 */

export const KNOWN_SELECTORS: Record<string, string> = {
  // ── Ownership ──────────────────────────────────────────────────────────────
  "0x8da5cb5b": "owner()",
  "0xf2fde38b": "transferOwnership(address)",
  "0x715018a6": "renounceOwnership()",

  // ── Proxy / Upgrade ────────────────────────────────────────────────────────
  "0x3659cfe6": "upgradeTo(address)",
  "0x4f1ef286": "upgradeToAndCall(address,bytes)",
  "0x5c60da1b": "implementation()",
  "0x52d1902d": "proxiableUUID()",

  // ── ERC-20 core ───────────────────────────────────────────────────────────
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x313ce567": "decimals()",
  "0x18160ddd": "totalSupply()",
  "0x70a08231": "balanceOf(address)",
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xdd62ed3e": "allowance(address,address)",

  // ── ERC-20 extensions ──────────────────────────────────────────────────────
  "0x40c10f19": "mint(address,uint256)",
  "0x9dc29fac": "burn(address,uint256)",
  "0x42966c68": "burn(uint256)",
  "0x79cc6790": "burnFrom(address,uint256)",
  "0xd505accf": "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "0x3644e515": "DOMAIN_SEPARATOR()",
  "0x7ecebe00": "nonces(address)",

  // ── Pausable ──────────────────────────────────────────────────────────────
  "0x8456cb59": "pause()",
  "0x3f4ba83a": "unpause()",
  "0x5c975abb": "paused()",

  // ── AccessControl ─────────────────────────────────────────────────────────
  "0xa217fddf": "DEFAULT_ADMIN_ROLE()",
  "0x91d14854": "hasRole(bytes32,address)",
  "0x2f2ff15d": "grantRole(bytes32,address)",
  "0xd547741f": "revokeRole(bytes32,address)",
  "0x36568abe": "renounceRole(bytes32,address)",
  "0x248a9ca3": "getRoleAdmin(bytes32)",
  "0x9010d07c": "getRoleMember(bytes32,uint256)",
  "0xca15c873": "getRoleMemberCount(bytes32)",
  "0x01ffc9a7": "supportsInterface(bytes4)",

  // ── Blacklist / Compliance ─────────────────────────────────────────────────
  "0xf9f92be4": "blacklist(address)",
  "0x10c16e46": "addToBlacklist(address)",
  "0x537df3b6": "unBlacklist(address)",
  "0xfe575a87": "isBlacklisted(address)",
  "0xe4997dc5": "removeBlacklisted(address)",

  // ── Fee / Tax ─────────────────────────────────────────────────────────────
  "0x77359501": "setFee(uint256)",
  "0x6c19e783": "setTax(uint256)",
  "0xe0d443ef": "setMaxTxAmount(uint256)",

  // ── ERC-721 ───────────────────────────────────────────────────────────────
  "0x6352211e": "ownerOf(uint256)",
  "0x42842e0e": "safeTransferFrom(address,address,uint256)",
  "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  "0xe985e9c5": "isApprovedForAll(address,address)",
  "0xa22cb465": "setApprovalForAll(address,bool)",
  "0xc87b56dd": "tokenURI(uint256)",

  // ── ERC-1155 ──────────────────────────────────────────────────────────────
  "0x00fdd58e": "balanceOf(address,uint256)",
  "0x4e1273f4": "balanceOfBatch(address[],uint256[])",
  "0x2eb2c2d6": "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
  "0xf242432a": "safeTransferFrom(address,address,uint256,uint256,bytes)",

  // ── Timelock ──────────────────────────────────────────────────────────────
  "0xf27a0c92": "getMinDelay()",
  "0x8f2a0bb0": "schedule(address,uint256,bytes,bytes32,bytes32,uint256)",
  "0xe38335e5": "scheduleBatch(address[],uint256[],bytes[],bytes32,bytes32,uint256)",
  "0x134008d3": "execute(address,uint256,bytes,bytes32,bytes32)",
  "0x591fcdfe": "cancel(bytes32)",

  // ── Gnosis Safe ───────────────────────────────────────────────────────────
  "0xe75235b8": "getThreshold()",
  "0x85e332cd": "getOwners()",
  "0x6a761202": "execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)",

  // ── Utility ───────────────────────────────────────────────────────────────
  "0x41c0e1b5": "kill()",       // selfdestruct pattern
  "0xd0e30db0": "deposit()",
  "0x2e1a7d4d": "withdraw(uint256)",
  "0x3ccfd60b": "withdraw()",
};

/**
 * Look up a selector, returning the signature or a shortened unknown label.
 */
export function lookupSelector(selector: string): string {
  const normalized = selector.toLowerCase().startsWith('0x')
    ? selector.toLowerCase()
    : `0x${selector.toLowerCase()}`;
  return KNOWN_SELECTORS[normalized] ?? `unknown(${normalized})`;
}
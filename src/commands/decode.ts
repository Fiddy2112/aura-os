import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import { isAddress } from 'viem';
import { getPublicClient } from '../core/blockchain/chains.js';

// ── 4byte.directory lookup ────────────────────────────────────────────────────

async function lookupSelector(selector: string): Promise<string[]> {
  try {
    const res = await axios.get(`https://www.4byte.directory/api/v1/signatures/`, {
      params:  { hex_signature: selector },
      timeout: 5000,
    });
    return (res.data.results ?? []).map((r: any) => r.text_signature as string);
  } catch { return []; }
}

async function lookupEvent(topic: string): Promise<string[]> {
  try {
    const res = await axios.get(`https://www.4byte.directory/api/v1/event-signatures/`, {
      params:  { hex_signature: topic },
      timeout: 5000,
    });
    return (res.data.results ?? []).map((r: any) => r.text_signature as string);
  } catch { return []; }
}

// ── ABI decode ────────────────────────────────────────────────────────────────

function splitCalldata(data: string): { selector: string; params: string[] } {
  const clean    = data.startsWith('0x') ? data.slice(2) : data;
  const selector = '0x' + clean.slice(0, 8);
  const payload  = clean.slice(8);

  // Split into 32-byte (64 hex char) chunks
  const params: string[] = [];
  for (let i = 0; i < payload.length; i += 64) {
    params.push('0x' + payload.slice(i, i + 64).padEnd(64, '0'));
  }
  return { selector, params };
}

function interpretParam(hex: string, index: number): { label: string; hint: string } {
  const raw = hex.slice(2);

  // Address: leading zeros + 20 bytes
  if (raw.startsWith('000000000000000000000000') && raw.length === 64) {
    const addr = '0x' + raw.slice(24);
    if (/^[0-9a-fA-F]{40}$/.test(raw.slice(24))) {
      return { label: `0x${raw.slice(24)}`, hint: 'address' };
    }
  }

  // uint256: likely a number if high bytes are zero
  const leading = raw.slice(0, 48);
  if (/^0+$/.test(leading)) {
    const val = BigInt(hex);
    if (val === 0n) return { label: '0', hint: 'uint256' };
    // Looks like a token amount (18 decimals)?
    const asEther = Number(val) / 1e18;
    const hint    = asEther > 0.0001 && asEther < 1e12
      ? `uint256 (~${asEther.toFixed(6)} if 18 dec)`
      : 'uint256';
    return { label: val.toLocaleString('en-US'), hint };
  }

  // Bytes32 / string hint
  try {
    const buf = Buffer.from(raw, 'hex');
    const str = buf.toString('utf8').replace(/\0/g, '').trim();
    if (str.length > 1 && /^[\x20-\x7E]+$/.test(str)) {
      return { label: hex, hint: `bytes32 ("${str.slice(0, 20)}")` };
    }
  } catch {}

  return { label: hex, hint: 'bytes32' };
}

// ── Decode transaction by hash ────────────────────────────────────────────────

async function decodeTxHash(hash: `0x${string}`) {
  const client = getPublicClient();
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash }),
    client.getTransactionReceipt({ hash }).catch(() => null),
  ]);

  return { tx, receipt };
}

// ── Display ───────────────────────────────────────────────────────────────────

function displayDecoded(
  selector:   string,
  signatures: string[],
  params:     { label: string; hint: string }[],
  raw:        string,
): void {
  const divider = chalk.gray('─'.repeat(60));

  console.log(chalk.bold.cyan('\n  Decoded Calldata'));
  console.log(divider);
  console.log(`  ${chalk.gray('Selector:')} ${chalk.cyan(selector)}`);

  if (signatures.length > 0) {
    console.log(`  ${chalk.gray('Function:')} ${chalk.green(signatures[0])}`);
    if (signatures.length > 1) {
      console.log(`  ${chalk.gray('Also:    ')} ${chalk.gray(signatures.slice(1).join(', '))}`);
    }
  } else {
    console.log(`  ${chalk.gray('Function:')} ${chalk.yellow('Unknown — not in 4byte.directory')}`);
  }

  if (params.length > 0) {
    console.log(chalk.bold.white('\n  Parameters:'));
    params.forEach((p, i) => {
      console.log(`  ${chalk.gray(`[${i}]`)} ${chalk.white(p.label.slice(0, 66))}`);
      console.log(`       ${chalk.gray(p.hint)}`);
    });
  }

  console.log(chalk.gray(`\n  Raw: ${raw.slice(0, 80)}${raw.length > 80 ? '...' : ''}`));
  console.log('');
}

// ── Command ───────────────────────────────────────────────────────────────────

export async function decodeCommand(args: string[]): Promise<void> {
  const input    = args[0];
  const jsonMode = args.includes('--json');

  if (!input || input === '--help') {
    console.log(chalk.bold.cyan('\n  aura decode <calldata | tx-hash> [--json]\n'));
    console.log(chalk.gray('  Decode any calldata or transaction using 4byte.directory.\n'));
    console.log(chalk.gray('  Examples:'));
    console.log(chalk.gray('    aura decode 0xa9059cbb000...'));
    console.log(chalk.gray('    aura decode 0xabc123...  (tx hash)\n'));
    return;
  }

  const spinner = ora(chalk.cyan(' Decoding...')).start();

  try {
    // ── Mode 1: tx hash (66 chars) ────────────────────────────────────────────
    if (input.startsWith('0x') && input.length === 66) {
      const { tx, receipt } = await decodeTxHash(input as `0x${string}`);
      const calldata = tx.input;

      if (!calldata || calldata === '0x') {
        spinner.stop();
        console.log(chalk.yellow('\n  This is a plain ETH transfer — no calldata.\n'));
        console.log(`  ${chalk.gray('From:')}  ${chalk.white(tx.from)}`);
        console.log(`  ${chalk.gray('To:')}    ${chalk.white(tx.to ?? 'contract creation')}`);
        console.log(`  ${chalk.gray('Value:')} ${chalk.yellow((Number(tx.value) / 1e18).toFixed(6))} ETH\n`);
        return;
      }

      const { selector, params: rawParams } = splitCalldata(calldata);
      const [signatures] = await Promise.all([lookupSelector(selector)]);
      spinner.stop();

      const params = rawParams.map((p, i) => interpretParam(p, i));

      if (jsonMode) {
        console.log(JSON.stringify({ selector, signatures, params: rawParams, tx: { from: tx.from, to: tx.to, value: tx.value.toString() } }, null, 2));
        return;
      }

      // Show tx meta
      const divider = chalk.gray('─'.repeat(60));
      console.log(chalk.bold.cyan('\n  Transaction'));
      console.log(divider);
      console.log(`  ${chalk.gray('Hash:')}   ${chalk.cyan(input.slice(0, 20))}...`);
      console.log(`  ${chalk.gray('From:')}   ${chalk.white(tx.from)}`);
      console.log(`  ${chalk.gray('To:')}     ${chalk.white(tx.to ?? 'contract creation')}`);
      console.log(`  ${chalk.gray('Value:')}  ${chalk.yellow((Number(tx.value) / 1e18).toFixed(6))} ETH`);
      if (receipt) {
        const statusLabel = receipt.status === 'success' ? chalk.green('✓ success') : chalk.red('✗ reverted');
        console.log(`  ${chalk.gray('Status:')} ${statusLabel}  ${chalk.gray(`gas: ${receipt.gasUsed.toLocaleString()}`)}`);
      }

      // Decode logs
      if (receipt && receipt.logs.length > 0) {
        console.log(chalk.bold.white(`\n  Events (${receipt.logs.length}):`));
        for (const log of receipt.logs.slice(0, 5)) {
          const topic   = log.topics[0] ?? '';
          const evtSigs = await lookupEvent(topic);
          const evtName = evtSigs[0] ?? topic.slice(0, 18) + '...';
          console.log(`  ${chalk.magenta(evtName)}  ${chalk.gray(log.address.slice(0, 10) + '...')}`);
        }
        if (receipt.logs.length > 5) console.log(chalk.gray(`  ... +${receipt.logs.length - 5} more`));
      }

      displayDecoded(selector, signatures, params, calldata);
      return;
    }

    // ── Mode 2: raw calldata ──────────────────────────────────────────────────
    if (input.startsWith('0x') && input.length >= 10) {
      const { selector, params: rawParams } = splitCalldata(input);
      const signatures = await lookupSelector(selector);
      spinner.stop();

      const params = rawParams.map((p, i) => interpretParam(p, i));

      if (jsonMode) {
        console.log(JSON.stringify({ selector, signatures, params: rawParams }, null, 2));
        return;
      }

      displayDecoded(selector, signatures, params, input);
      return;
    }

    spinner.stop();
    console.error(chalk.red('\n  Input must be a tx hash (0x + 64 chars) or calldata (0x + 8+ chars)\n'));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red(`\n  Error: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}
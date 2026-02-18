import { SUPPORTED_CHAINS, getCurrentChain, setChain } from '../core/blockchain/chains.js';

export default async function chainCommand(args: string[]) {
  const sub = args[0];

  if (!sub || sub === 'current') {
    const current = getCurrentChain();
    console.log(`${current.name} (${current.id})`);
    return;
  }

  if (sub === 'list') {
    console.log(Object.keys(SUPPORTED_CHAINS).join('\n'));
    return;
  }

  setChain(sub);
  const current = getCurrentChain();
  console.log(`Chain set to ${sub} (${current.name})`);
}
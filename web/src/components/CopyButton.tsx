import { useState } from 'react';
import { Copy, CopyCheck } from 'lucide-react';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <CopyCheck size={18} className="text-green-500" />
      ) : (
        <Copy size={18} />
      )}
    </button>
  );
}

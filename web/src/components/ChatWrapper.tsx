import Web3Provider from './Web3Provider';
import AuraChat from './AuraChat';

export default function ChatWrapper() {
  return (
    <Web3Provider>
      <AuraChat />
    </Web3Provider>
  );
}

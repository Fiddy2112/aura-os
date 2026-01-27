import { TypeAnimation } from 'react-type-animation';

interface AnimatedCodeProps {
  sequence: (string | number)[];
}

export default function AnimatedCode({ sequence }: AnimatedCodeProps) {
  return (
    <span className="text-green-400 whitespace-pre-wrap">
      <TypeAnimation
        sequence={sequence}
        wrapper="span"
        cursor={true}
        repeat={Infinity}
        speed={40}
        deletionSpeed={60}
        style={{ display: 'inline-block' }}
      />
    </span>
  );
}
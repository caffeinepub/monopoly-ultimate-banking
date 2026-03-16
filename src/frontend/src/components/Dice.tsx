import React from "react";

const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [25, 25],
    [75, 25],
    [25, 50],
    [75, 50],
    [25, 75],
    [75, 75],
  ],
};

interface DiceProps {
  value: number;
  rolling?: boolean;
  delayMs?: number;
}

export function Die({ value, rolling, delayMs = 0 }: DiceProps) {
  const dots = DOTS[value] || DOTS[1];
  return (
    <div
      className={`w-14 h-14 bg-white rounded-xl border-2 border-gray-300 relative shadow-lg ${
        rolling ? "dice-rolling" : ""
      }`}
      style={rolling ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {dots.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          className="absolute w-3 h-3 bg-gray-800 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

interface DicePairProps {
  dice: [number, number];
  rolling?: boolean;
  tappable?: boolean;
  onClick?: () => void;
}

export function DicePair({ dice, rolling, tappable, onClick }: DicePairProps) {
  if (tappable) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          data-ocid="game.roll_dice_button"
          onClick={onClick}
          disabled={rolling}
          className="relative flex gap-3 justify-center p-3 rounded-2xl ring-2 ring-green-400 animate-pulse focus:outline-none disabled:opacity-50 disabled:animate-none"
          aria-label="Tap to roll dice"
        >
          <Die value={dice[0]} rolling={rolling} delayMs={0} />
          <Die value={dice[1]} rolling={rolling} delayMs={50} />
        </button>
        <p className="text-green-400 text-xs font-semibold tracking-wide animate-pulse">
          {rolling ? "Rolling..." : "Tap to Roll"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 justify-center">
      <Die value={dice[0]} rolling={rolling} delayMs={0} />
      <Die value={dice[1]} rolling={rolling} delayMs={50} />
    </div>
  );
}

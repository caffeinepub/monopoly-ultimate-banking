import type React from "react";
import { useEffect, useState } from "react";
import { COLOR_MAP } from "../data/board";
import type { BoardSpace, Player, Property } from "../types/game";

interface SquareBoardProps {
  spaces: BoardSpace[];
  properties: Property[];
  players: Player[];
  currentPlayerIndex: number;
  dice: [number, number];
  rolling: boolean;
  animatingPlayer?: { playerId: number; position: number } | null;
}

// Build 11x11 grid mapping: grid[row][col] = space index (0-39) or null for center
function buildGrid(): (number | null)[][] {
  const grid: (number | null)[][] = Array(11)
    .fill(null)
    .map(() => Array(11).fill(null));
  // Bottom row (row=10): spaces 0-10, left to right
  for (let col = 0; col <= 10; col++) {
    grid[10][col] = col;
  }
  // Right col (col=10): spaces 11-19, bottom to top
  for (let i = 0; i < 9; i++) {
    grid[9 - i][10] = 11 + i;
  }
  // Top row (row=0): spaces 20-30, right to left
  for (let i = 0; i <= 10; i++) {
    grid[0][10 - i] = 20 + i;
  }
  // Left col (col=0): spaces 31-39, top to bottom
  for (let i = 0; i < 9; i++) {
    grid[1 + i][0] = 31 + i;
  }
  return grid;
}

const GRID = buildGrid();
const HOUSE_KEYS = ["h0", "h1", "h2", "h3"] as const;

function getSpaceEmoji(space: BoardSpace): string {
  switch (space.type) {
    case "go":
      return "GO";
    case "go-to-jail":
      return "🚔";
    case "visiting":
      return "⛓";
    case "free-parking":
      return "🚗";
    case "chance":
      return "?";
    case "community-chest":
      return "💰";
    case "tax":
      return "💸";
    case "railroad":
      return "🚂";
    case "utility":
      return "⚡";
    default:
      return "";
  }
}

function HouseIcons({ houses }: { houses: number }) {
  if (houses === 0) return null;
  if (houses >= 5) {
    return <div style={{ fontSize: 8, lineHeight: 1 }}>🏨</div>;
  }
  return (
    <div className="flex flex-wrap gap-[1px] justify-center">
      {HOUSE_KEYS.slice(0, houses).map((key) => (
        <div
          key={key}
          style={{
            width: 4,
            height: 5,
            backgroundColor: "#22c55e",
            borderRadius: 1,
          }}
          className="flex-shrink-0"
        />
      ))}
    </div>
  );
}

function BoardCell({
  row,
  col,
  spaceIndex,
  spaces,
  properties,
  players,
  currentPlayerIndex,
  animatingPlayer,
}: {
  row: number;
  col: number;
  spaceIndex: number;
  spaces: BoardSpace[];
  properties: Property[];
  players: Player[];
  currentPlayerIndex: number;
  animatingPlayer?: { playerId: number; position: number } | null;
}) {
  const space = spaces[spaceIndex];
  const prop = space.propertyId
    ? properties.find((p) => p.id === space.propertyId)
    : undefined;

  // Build effective player positions: override animating player's position
  const effectivePlayers = players.map((p) => {
    if (animatingPlayer && p.id === animatingPlayer.playerId) {
      return { ...p, position: animatingPlayer.position };
    }
    return p;
  });

  const playersHere = effectivePlayers.filter(
    (p) => p.position === spaceIndex && !p.bankrupt,
  );
  const currentPlayer = players[currentPlayerIndex];

  // For highlighting: use effective position of current player
  const effectiveCurrentPos =
    animatingPlayer && currentPlayer.id === animatingPlayer.playerId
      ? animatingPlayer.position
      : currentPlayer.position;

  const isCurrentPos = effectiveCurrentPos === spaceIndex;
  const isCorner = (row === 0 || row === 10) && (col === 0 || col === 10);

  // Check if animating player is here for the hop animation
  const isAnimatingHere =
    animatingPlayer !== null &&
    animatingPlayer !== undefined &&
    animatingPlayer.position === spaceIndex;

  const colorHex = space.color ? COLOR_MAP[space.color] : null;
  const owner = prop?.ownerId !== undefined ? players[prop.ownerId] : undefined;

  let bandPos: "top" | "bottom" | "left" | "right" | null = null;
  if (row === 10 && !isCorner) bandPos = "top";
  else if (row === 0 && !isCorner) bandPos = "bottom";
  else if (col === 10 && !isCorner) bandPos = "left";
  else if (col === 0 && !isCorner) bandPos = "right";

  const spaceEmoji = getSpaceEmoji(space);
  const isProperty =
    space.type === "property" ||
    space.type === "railroad" ||
    space.type === "utility";

  const shortName =
    space.name.length > 9 ? `${space.name.slice(0, 8)}…` : space.name;

  const bandThicknessH = 8;
  const bandThicknessV = 6;

  return (
    <div
      data-ocid={`board.space.item.${spaceIndex + 1}`}
      className="relative flex flex-col overflow-hidden"
      style={{
        backgroundColor: isCurrentPos
          ? "#fef3c7"
          : isCorner
            ? "#f0e8d0"
            : "#faf6ed",
        border: "1px solid #1a5c28",
        boxShadow: isCurrentPos ? "inset 0 0 0 1.5px #f59e0b" : undefined,
        minWidth: 0,
        zIndex: isCurrentPos ? 10 : undefined,
      }}
    >
      {/* Color band */}
      {colorHex && bandPos === "top" && (
        <div
          className="w-full flex-shrink-0"
          style={{
            height: bandThicknessH,
            backgroundColor: colorHex,
            borderBottom: "1px solid rgba(0,0,0,0.2)",
          }}
        />
      )}
      {colorHex && bandPos === "bottom" && (
        <div
          className="w-full flex-shrink-0 absolute bottom-0 left-0 right-0"
          style={{
            height: bandThicknessH,
            backgroundColor: colorHex,
            borderTop: "1px solid rgba(0,0,0,0.2)",
          }}
        />
      )}
      {colorHex && bandPos === "left" && (
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: bandThicknessV,
            backgroundColor: colorHex,
            borderRight: "1px solid rgba(0,0,0,0.2)",
          }}
        />
      )}
      {colorHex && bandPos === "right" && (
        <div
          className="absolute top-0 bottom-0 right-0"
          style={{
            width: bandThicknessV,
            backgroundColor: colorHex,
            borderLeft: "1px solid rgba(0,0,0,0.2)",
          }}
        />
      )}

      {/* Owner dot */}
      {owner && (
        <div
          className="absolute top-[2px] right-[2px] rounded-full border border-white/70"
          style={{ width: 6, height: 6, backgroundColor: owner.color }}
        />
      )}

      {/* Cell content */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{
          paddingLeft: bandPos === "left" ? bandThicknessV + 1 : 1,
          paddingRight: bandPos === "right" ? bandThicknessV + 1 : 1,
          paddingTop: bandPos === "top" ? 2 : 1,
          paddingBottom: bandPos === "bottom" ? bandThicknessH + 2 : 1,
        }}
      >
        {isCorner ? (
          <div className="flex flex-col items-center justify-center h-full gap-[1px]">
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                lineHeight: 1,
                textAlign: "center",
                color: "#1a1a1a",
              }}
            >
              {spaceEmoji}
            </span>
            <span
              style={{
                fontSize: 5,
                color: "#555",
                lineHeight: 1,
                textAlign: "center",
              }}
            >
              {shortName}
            </span>
          </div>
        ) : (
          <>
            {!isProperty && (
              <span
                style={{
                  fontSize: 7,
                  lineHeight: 1,
                  color: "#b8860b",
                  fontWeight: 700,
                }}
              >
                {spaceEmoji}
              </span>
            )}
            <span
              style={{
                fontSize: 5,
                lineHeight: 1.15,
                color: "#1a1a1a",
                fontWeight: 600,
                textAlign: "center",
                wordBreak: "break-word",
                width: "100%",
              }}
            >
              {shortName}
            </span>
            {prop && (
              <span
                style={{
                  fontSize: 5,
                  lineHeight: 1,
                  color: "#006400",
                  fontFamily: "monospace",
                  fontWeight: 700,
                }}
              >
                ${prop.price}
              </span>
            )}
            {prop && prop.houses > 0 && <HouseIcons houses={prop.houses} />}
          </>
        )}
      </div>

      {/* Player tokens */}
      {playersHere.length > 0 && (
        <div
          className="flex flex-wrap gap-[1px] justify-center flex-shrink-0"
          style={{ paddingBottom: 2 }}
        >
          {playersHere.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className={
                isAnimatingHere && p.id === animatingPlayer?.playerId
                  ? "token-hop"
                  : ""
              }
              style={{
                width: 8,
                height: 8,
                backgroundColor: p.color,
                border: "1.5px solid white",
                borderRadius: "50%",
                boxShadow:
                  isAnimatingHere && p.id === animatingPlayer?.playerId
                    ? `0 0 6px ${p.color}, 0 2px 4px rgba(0,0,0,0.6)`
                    : "0 1px 2px rgba(0,0,0,0.4)",
                flexShrink: 0,
                transition: "box-shadow 0.1s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Dice display with rolling animation — shows random cycling numbers while rolling */
function CenterDice({
  dice,
  rolling,
}: {
  dice: [number, number];
  rolling: boolean;
}) {
  const [displayDice, setDisplayDice] = useState<[number, number]>(dice);

  useEffect(() => {
    if (!rolling) {
      setDisplayDice(dice);
      return;
    }
    const interval = setInterval(() => {
      setDisplayDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 80);
    return () => clearInterval(interval);
  }, [rolling, dice]);

  const dieStyle: React.CSSProperties = {
    backgroundColor: "white",
    borderRadius: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#1a1a1a",
    boxShadow: rolling
      ? "0 3px 8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.3)"
      : "0 2px 4px rgba(0,0,0,0.4)",
    fontSize: "clamp(8px, 2vw, 14px)",
    width: "clamp(14px, 3.5vw, 26px)",
    height: "clamp(14px, 3.5vw, 26px)",
    transition: "box-shadow 0.1s",
  };

  return (
    <div className="flex items-center gap-1 mt-0.5">
      <div className={rolling ? "dice-rolling" : ""} style={dieStyle}>
        {displayDice[0]}
      </div>
      <div
        className={rolling ? "dice-rolling" : ""}
        style={{
          ...dieStyle,
          animationDelay: rolling ? "0.04s" : undefined,
        }}
      >
        {displayDice[1]}
      </div>
    </div>
  );
}

export function SquareBoard({
  spaces,
  properties,
  players,
  currentPlayerIndex,
  dice,
  rolling,
  animatingPlayer,
}: SquareBoardProps) {
  const currentPlayer = players[currentPlayerIndex];
  const activePlayers = players.filter((p) => !p.bankrupt);

  return (
    <div
      className="w-full aspect-square relative overflow-hidden"
      style={{
        backgroundColor: "#1a6b30",
        border: "3px solid #1a5c28",
        boxShadow: "0 4px 32px -4px rgba(0,0,0,0.6)",
      }}
    >
      {/* 11x11 grid */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: "repeat(11, 1fr)",
          gridTemplateRows: "repeat(11, 1fr)",
        }}
      >
        {GRID.map((rowArr, row) =>
          rowArr.map((spaceIndex, col) => {
            if (spaceIndex === null) return null;
            return (
              <BoardCell
                key={`space-${spaceIndex}`}
                row={row}
                col={col}
                spaceIndex={spaceIndex}
                spaces={spaces}
                properties={properties}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                animatingPlayer={animatingPlayer}
              />
            );
          }),
        )}

        {/* Center area: spans rows 1-9, cols 1-9 */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            gridColumn: "2 / 11",
            gridRow: "2 / 11",
            backgroundColor: "#1a6b30",
          }}
        >
          <div className="flex flex-col items-center gap-1 select-none w-full px-1">
            {/* MONOPOLY Logo */}
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 900,
                color: "#ffd700",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                fontSize: "clamp(10px, 3.5vw, 26px)",
              }}
            >
              MONOPOLY
            </div>
            <div
              style={{
                color: "#ffd700",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontSize: "clamp(4px, 1vw, 8px)",
                opacity: 0.85,
              }}
            >
              Ultimate Banking
            </div>

            {/* Animated dice */}
            <CenterDice dice={dice} rolling={rolling} />

            {/* Turn order — clockwise */}
            <div className="flex flex-col items-center mt-1" style={{ gap: 2 }}>
              <div
                style={{
                  color: "#ffd700",
                  fontSize: "clamp(5px, 1.2vw, 9px)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Turn Order
              </div>
              <div
                style={{
                  color: "#ffd700",
                  fontSize: "clamp(12px, 3vw, 22px)",
                  lineHeight: 1,
                  fontWeight: 700,
                }}
              >
                ↻
              </div>
              {/* Player order chips */}
              <div className="flex flex-wrap justify-center" style={{ gap: 2 }}>
                {activePlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    title={p.name}
                    style={{
                      width: "clamp(8px, 2vw, 14px)",
                      height: "clamp(8px, 2vw, 14px)",
                      backgroundColor: p.color,
                      borderRadius: "50%",
                      border:
                        p.id === currentPlayer.id
                          ? "2px solid #ffd700"
                          : "1.5px solid rgba(255,255,255,0.6)",
                      boxShadow:
                        p.id === currentPlayer.id
                          ? "0 0 4px #ffd700"
                          : "0 1px 2px rgba(0,0,0,0.3)",
                      position: "relative",
                    }}
                  >
                    {idx === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -4,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: 4,
                          color: "#ffd700",
                          lineHeight: 1,
                          fontWeight: 700,
                        }}
                      >
                        ▲
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  color: "rgba(255,215,0,0.7)",
                  fontSize: "clamp(4px, 0.9vw, 7px)",
                  fontWeight: 500,
                }}
              >
                {currentPlayer.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

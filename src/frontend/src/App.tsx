import React, { useEffect, useRef, useState } from "react";
import { AuctionPanel } from "./components/AuctionPanel";
import { BankingPanel } from "./components/BankingPanel";
import { CardModal } from "./components/CardModal";
import { DicePair } from "./components/Dice";
import { PropertyCard } from "./components/PropertyCard";
import { SquareBoard } from "./components/SquareBoard";
import { TradePanel } from "./components/TradePanel";
import { BOARD_SPACES, PLAYER_ANIMALS, PLAYER_COLORS } from "./data/board";
import { useGame } from "./hooks/useGame";

const STORAGE_KEY = "monopoly_game_state";

export default function App() {
  const { state, dispatch } = useGame();
  const [rolling, setRolling] = useState(false);
  const [animatingPlayer, setAnimatingPlayer] = useState<{
    playerId: number;
    position: number;
  } | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  const handleRollDice = () => {
    if (rolling) return;
    setRolling(true);

    setTimeout(() => {
      setRolling(false);

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      const currentPlayer = state.players[state.currentPlayerIndex];

      if (currentPlayer.inJail) {
        dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
        return;
      }

      const startPos = currentPlayer.position;
      const playerId = currentPlayer.id;
      let step = 0;

      const stepAnimation = () => {
        step += 1;
        const pos = (startPos + step) % 40;
        setAnimatingPlayer({ playerId, position: pos });

        if (step < total) {
          animationRef.current = setTimeout(stepAnimation, 350);
        } else {
          animationRef.current = setTimeout(() => {
            setAnimatingPlayer(null);
            dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
          }, 200);
        }
      };

      animationRef.current = setTimeout(stepAnimation, 80);
    }, 700);
  };

  if (state.phase === "lobby") {
    return <HomeScreen onStart={() => dispatch({ type: "START_SETUP" })} />;
  }

  if (state.phase === "setup") {
    return (
      <SetupScreen
        onStart={(players) => dispatch({ type: "START_GAME", players })}
      />
    );
  }

  if (state.phase === "ended") {
    const winner = state.players.find((p) => p.id === state.winner);
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-white text-3xl font-bold mb-2">Winner!</h1>
        <div
          className="w-20 h-20 rounded-full mb-4 flex items-center justify-center text-3xl"
          style={{
            backgroundColor: winner ? PLAYER_COLORS[winner.id] : "#888",
          }}
        >
          {winner
            ? (PLAYER_ANIMALS[winner.id] ?? winner.name[0].toUpperCase())
            : "?"}
        </div>
        <p className="text-yellow-400 text-2xl font-bold mb-2">
          {winner?.name}
        </p>
        <p className="text-green-400 text-xl mb-8">
          Final Balance: ${winner?.balance.toLocaleString()}M
        </p>
        <button
          type="button"
          data-ocid="winner.play_again_button"
          onClick={() => dispatch({ type: "PLAY_AGAIN" })}
          className="bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl"
        >
          Play Again
        </button>
      </div>
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentSpace = BOARD_SPACES[currentPlayer.position];
  const propertyToBuy = state.showPropertyCard
    ? state.properties.find((p) => p.id === state.showPropertyCard)
    : undefined;
  const auctionProperty =
    state.showAuctionPanel && state.auctionPropertyId
      ? state.properties.find((p) => p.id === state.auctionPropertyId)
      : undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800 flex-shrink-0">
        <div>
          <h1 className="text-green-400 font-bold text-sm leading-tight">
            Monopoly
          </h1>
          <p className="text-gray-500 text-[9px] leading-tight">
            Ultimate Banking
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {state.players.map((p, i) => (
            <div
              key={p.id}
              data-ocid={`game.player_balance.${i + 1}`}
              className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all ${
                i === state.currentPlayerIndex
                  ? "ring-2 ring-white/60 scale-105"
                  : "opacity-60"
              } ${p.bankrupt ? "opacity-20" : ""}`}
              style={{ backgroundColor: `${p.color}33` }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {PLAYER_ANIMALS[p.id] ?? p.name[0].toUpperCase()}
              </div>
              <span className="text-[9px] font-mono text-white leading-none">
                $
                {p.balance >= 1000
                  ? `${(p.balance / 1000).toFixed(1)}k`
                  : p.balance}
                M
              </span>
              {p.inJail && <span className="text-[8px]">🔒</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Current Player Turn Banner */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ backgroundColor: currentPlayer.color }}
        data-ocid="game.turn_banner"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-lg">
            {PLAYER_ANIMALS[currentPlayer.id] ??
              currentPlayer.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">
              {currentPlayer.name}&apos;s Turn
            </p>
            <p className="text-white/80 text-xs font-mono leading-tight">
              Balance: ${currentPlayer.balance.toLocaleString()}M
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-white/70 text-[10px] uppercase tracking-widest font-bold">
            Turn
          </span>
          <span className="text-white text-2xl leading-none">↺</span>
          <span className="text-white/70 text-[10px] font-medium">
            Anti-clockwise
          </span>
        </div>
      </div>

      {/* Message bar */}
      <div className="bg-gray-800/90 px-4 py-1 text-center flex-shrink-0">
        <p className="text-yellow-300 text-xs leading-tight">{state.message}</p>
      </div>

      {/* Square Board */}
      <div className="flex-shrink-0 w-full">
        <SquareBoard
          spaces={BOARD_SPACES}
          properties={state.properties}
          players={state.players}
          currentPlayerIndex={state.currentPlayerIndex}
          dice={state.dice}
          rolling={rolling}
          animatingPlayer={animatingPlayer}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-900 px-4 py-3 space-y-2 border-t border-gray-800 flex-shrink-0">
        <p className="text-center text-gray-400 text-xs">
          {currentPlayer.inJail ? "🔒 In Jail" : `📍 ${currentSpace.name}`}
        </p>
        <DicePair
          dice={state.dice}
          rolling={rolling}
          tappable={!state.diceRolled && !rolling}
          onClick={!state.diceRolled && !rolling ? handleRollDice : undefined}
        />
        <div className="flex gap-2">
          {currentPlayer.inJail && !state.diceRolled && (
            <button
              type="button"
              onClick={() => dispatch({ type: "PAY_JAIL" })}
              className="flex-1 py-2.5 bg-red-700 rounded-xl font-bold text-sm"
            >
              Pay $500 Bail
            </button>
          )}
          {state.diceRolled &&
            !state.showPropertyCard &&
            !state.showCardModal &&
            !state.showAuctionPanel && (
              <button
                type="button"
                data-ocid="game.end_turn_button"
                onClick={() => dispatch({ type: "END_TURN" })}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm"
              >
                Done ✓
              </button>
            )}
          <button
            type="button"
            data-ocid="game.trade_button"
            onClick={() => dispatch({ type: "OPEN_TRADE" })}
            className="px-3 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm"
          >
            🤝
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_BANKING" })}
            className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm"
          >
            🏦
          </button>
        </div>
      </div>

      {propertyToBuy && (
        <PropertyCard
          property={propertyToBuy}
          playerBalance={currentPlayer.balance}
          onBuy={() => dispatch({ type: "BUY_PROPERTY" })}
          onDecline={() => dispatch({ type: "DISMISS_PROPERTY_CARD" })}
          onAuction={() => dispatch({ type: "AUCTION_PROPERTY" })}
        />
      )}

      {auctionProperty && (
        <AuctionPanel
          property={auctionProperty}
          players={state.players}
          onComplete={(winnerId, bidAmount) =>
            dispatch({ type: "COMPLETE_AUCTION", winnerId, bidAmount })
          }
          onCancel={() => dispatch({ type: "DISMISS_PROPERTY_CARD" })}
        />
      )}

      {state.showCardModal && (
        <CardModal
          card={state.showCardModal}
          playerName={currentPlayer.name}
          onDismiss={() => dispatch({ type: "DISMISS_CARD" })}
        />
      )}

      {state.showBankingPanel && (
        <BankingPanel
          state={state}
          onMortgage={(id) => dispatch({ type: "MORTGAGE", propertyId: id })}
          onUnmortgage={(id) =>
            dispatch({ type: "UNMORTGAGE", propertyId: id })
          }
          onBuyHouse={(id) => dispatch({ type: "BUILD_HOUSE", propertyId: id })}
          onSellHouse={(id) => dispatch({ type: "SELL_HOUSE", propertyId: id })}
          onClose={() => dispatch({ type: "TOGGLE_BANKING" })}
        />
      )}

      {state.showTradePanel && (
        <TradePanel
          state={state}
          onExecute={(trade) => dispatch({ type: "EXECUTE_TRADE", trade })}
          onClose={() => dispatch({ type: "CLOSE_TRADE" })}
        />
      )}
    </div>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">🎩</div>
        <h1 className="text-white text-4xl font-extrabold mb-1">Monopoly</h1>
        <p className="text-green-400 text-xl font-semibold tracking-wider">
          ULTIMATE BANKING
        </p>
      </div>
      <div className="w-full max-w-xs space-y-4">
        <button
          type="button"
          data-ocid="home.offline_button"
          onClick={onStart}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-2xl shadow-lg"
        >
          🎮 Play Offline
        </button>
        <button
          type="button"
          data-ocid="home.online_button"
          disabled
          className="w-full py-4 bg-gray-700 text-gray-500 font-bold text-lg rounded-2xl cursor-not-allowed"
        >
          🌐 Online (Coming Soon)
        </button>
      </div>
      <p className="text-gray-600 text-sm mt-8">
        2-6 players · Pass &amp; Play
      </p>
    </div>
  );
}

const PLAYER_SLOTS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

function SetupScreen({
  onStart,
}: { onStart: (players: { name: string }[]) => void }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState([
    "Player 1",
    "Player 2",
    "Player 3",
    "Player 4",
    "Player 5",
    "Player 6",
  ]);

  const handleStart = () => {
    const players = names
      .slice(0, count)
      .map((name) => ({ name: name.trim() || "Player" }));
    onStart(players);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-white text-2xl font-bold mb-6 text-center">
        Game Setup
      </h1>
      <div className="mb-6">
        <label
          htmlFor="player-count"
          className="text-gray-400 text-sm mb-2 block"
        >
          Number of Players
        </label>
        <select
          id="player-count"
          data-ocid="setup.player_count_select"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full bg-gray-800 text-white rounded-xl p-3 text-lg border border-gray-700"
        >
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} Players
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3 mb-8">
        {PLAYER_SLOTS.slice(0, count).map((slotId, i) => (
          <div key={slotId} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: PLAYER_COLORS[i] }}
            >
              {PLAYER_ANIMALS[i]}
            </div>
            <input
              data-ocid="setup.player_name_input"
              type="text"
              value={names[i]}
              onChange={(e) => {
                const newNames = [...names];
                newNames[i] = e.target.value;
                setNames(newNames);
              }}
              placeholder={`Player ${i + 1}`}
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-green-500"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        data-ocid="setup.start_button"
        onClick={handleStart}
        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-xl rounded-2xl"
      >
        Start Game 🎲
      </button>
      <p className="text-gray-600 text-xs text-center mt-4">
        Each player starts with $15,000M
      </p>
    </div>
  );
}

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AuctionPanel } from "./components/AuctionPanel";
import { BankingPanel } from "./components/BankingPanel";
import { CardModal } from "./components/CardModal";
import { DicePair } from "./components/Dice";
import { PropertyCard } from "./components/PropertyCard";
import { SquareBoard } from "./components/SquareBoard";
import { TradePanel } from "./components/TradePanel";
import { BOARD_SPACES, PLAYER_ANIMALS, PLAYER_COLORS } from "./data/board";
import { useActor } from "./hooks/useActor";
import {
  type Action,
  createInitialState,
  gameReducer,
  useGame,
} from "./hooks/useGame";
import type { GameState } from "./types/game";

const STORAGE_KEY = "monopoly_game_state";

type AppScreen = "home" | "online-menu" | "waiting-room" | "game";

interface OnlineCtx {
  roomId: string;
  mySlotId: number;
  isHost: boolean;
  myName: string;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [onlineCtx, setOnlineCtx] = useState<OnlineCtx | null>(null);
  const offlineGame = useGame();

  const handleGoHome = useCallback(() => {
    setScreen("home");
    setOnlineCtx(null);
  }, []);

  if (screen === "home") {
    return (
      <HomeScreen
        onOffline={() => {
          offlineGame.dispatch({ type: "START_SETUP" });
          setScreen("game");
        }}
        onOnline={() => setScreen("online-menu")}
      />
    );
  }

  if (screen === "online-menu") {
    return (
      <OnlineModeScreen
        onBack={() => setScreen("home")}
        onRoomReady={(ctx) => {
          setOnlineCtx(ctx);
          setScreen("waiting-room");
        }}
      />
    );
  }

  if (screen === "waiting-room" && onlineCtx) {
    return (
      <WaitingRoomScreen
        ctx={onlineCtx}
        onBack={handleGoHome}
        onGameStart={(_initialState) => {
          setScreen("game");
        }}
      />
    );
  }

  // Game screen
  return <GameScreen offlineGame={offlineGame} onGoHome={handleGoHome} />;
}

// ── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({
  onOffline,
  onOnline,
}: {
  onOffline: () => void;
  onOnline: () => void;
}) {
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
          onClick={onOffline}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-2xl shadow-lg"
        >
          🎮 Play Offline
        </button>
        <button
          type="button"
          data-ocid="home.online_button"
          onClick={onOnline}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-lg"
        >
          🌐 Play Online
        </button>
      </div>
      <p className="text-gray-600 text-sm mt-8">
        2-6 players · Pass &amp; Play or Online
      </p>
    </div>
  );
}

// ── Online Mode Screen ────────────────────────────────────────────────────────

function OnlineModeScreen({
  onBack,
  onRoomReady,
}: {
  onBack: () => void;
  onRoomReady: (ctx: OnlineCtx) => void;
}) {
  const { actor } = useActor();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [hostName, setHostName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!hostName.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const roomId = generateRoomCode();
      if (!actor) throw new Error("Not connected");
      const result = await actor.createRoom({
        hostName: hostName.trim(),
        maxPlayers: BigInt(6),
        roomId,
      });
      if (result.__kind__ === "success") {
        onRoomReady({
          roomId,
          mySlotId: 0,
          isHost: true,
          myName: hostName.trim(),
        });
      } else {
        setError(`Failed to create room: ${result.__kind__}`);
      }
    } catch (_e) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinName.trim()) {
      setError("Enter your name");
      return;
    }
    if (!joinCode.trim()) {
      setError("Enter a room code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!actor) throw new Error("Not connected");
      const result = await actor.joinRoom(
        joinCode.trim().toUpperCase(),
        joinName.trim(),
      );
      if (result.__kind__ === "ok") {
        const slotId = Number(result.ok.slotId);
        onRoomReady({
          roomId: joinCode.trim().toUpperCase(),
          mySlotId: slotId,
          isHost: false,
          myName: joinName.trim(),
        });
      } else {
        setError("Room not found or is full.");
      }
    } catch (_e) {
      setError("Room not found or is full.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          data-ocid="online-menu.back_button"
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ←
        </button>
        <h1 className="text-white text-2xl font-bold">Play Online</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          data-ocid="online-menu.create_tab"
          onClick={() => {
            setTab("create");
            setError("");
          }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm ${
            tab === "create"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          🏠 Create Room
        </button>
        <button
          type="button"
          data-ocid="online-menu.join_tab"
          onClick={() => {
            setTab("join");
            setError("");
          }}
          className={`flex-1 py-3 rounded-xl font-bold text-sm ${
            tab === "join"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          🔗 Join Room
        </button>
      </div>

      {tab === "create" ? (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5">
            <p className="text-gray-400 text-sm mb-3">Your name</p>
            <input
              data-ocid="online-menu.host_name_input"
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-blue-500 text-lg"
              maxLength={20}
            />
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-4">
            <p className="text-gray-400 text-sm text-center">
              A 6-character room code will be generated. Share it with friends
              so they can join!
            </p>
          </div>
          <button
            type="button"
            data-ocid="online-menu.create_room_button"
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg rounded-2xl"
          >
            {loading ? "Creating..." : "Create Room 🚀"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <div>
              <p className="text-gray-400 text-sm mb-2">Your name</p>
              <input
                data-ocid="online-menu.join_name_input"
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-blue-500 text-lg"
                maxLength={20}
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Room code</p>
              <input
                data-ocid="online-menu.room_code_input"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:outline-none focus:border-blue-500 text-lg font-mono tracking-widest uppercase"
                maxLength={6}
              />
            </div>
          </div>
          <button
            type="button"
            data-ocid="online-menu.join_room_button"
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg rounded-2xl"
          >
            {loading ? "Joining..." : "Join Game 🎮"}
          </button>
        </div>
      )}

      {error && (
        <div
          data-ocid="online-menu.error_state"
          className="mt-4 bg-red-900/50 border border-red-700 text-red-300 rounded-xl p-3 text-sm text-center"
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ── Waiting Room Screen ───────────────────────────────────────────────────────

function WaitingRoomScreen({
  ctx,
  onBack,
  onGameStart,
}: {
  ctx: OnlineCtx;
  onBack: () => void;
  onGameStart: (initialState: GameState) => void;
}) {
  const { actor } = useActor();
  const [players, setPlayers] = useState<
    Array<{ name: string; slotId: number }>
  >([]);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<"waiting" | "game">("waiting");
  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(
    null,
  );
  const hasStarted = useRef(false);

  const pollRoom = useCallback(async () => {
    try {
      if (!actor) return;
      const room = await actor.getRoom(ctx.roomId);
      const roomPlayers = room.players.map((p) => ({
        name: p.name,
        slotId: Number(p.slotId),
      }));
      setPlayers(roomPlayers);

      // Detect game started
      if (
        room.phase === "playing" &&
        room.gameStateJson &&
        !hasStarted.current
      ) {
        hasStarted.current = true;
        const gs = JSON.parse(room.gameStateJson) as GameState;
        setOnlineGameState(gs);
        setScreen("game");
        onGameStart(gs);
      }
    } catch {}
  }, [ctx.roomId, onGameStart, actor]);

  useEffect(() => {
    pollRoom();
    const interval = setInterval(pollRoom, 2000);
    return () => clearInterval(interval);
  }, [pollRoom]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ctx.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: show code prominently
    }
  };

  const handleStartGame = async () => {
    if (players.length < 2) {
      setError("Need at least 2 players to start");
      return;
    }
    setStarting(true);
    setError("");
    try {
      // Build initial game state from players in room
      const sortedPlayers = [...players].sort((a, b) => a.slotId - b.slotId);
      const initialState = gameReducer(createInitialState(), {
        type: "START_GAME",
        players: sortedPlayers.map((p) => ({ name: p.name })),
      });

      if (!actor) throw new Error("Not connected");
      // Push game state first, then start game
      await actor.updateGameState(ctx.roomId, JSON.stringify(initialState));
      await actor.startGame(ctx.roomId);
    } catch (_e) {
      setError("Failed to start game. Try again.");
      setStarting(false);
    }
  };

  if (screen === "game" && onlineGameState) {
    return (
      <OnlineGameScreen
        initialState={onlineGameState}
        ctx={ctx}
        _onGoHome={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          data-ocid="waiting-room.back_button"
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ←
        </button>
        <h1 className="text-white text-xl font-bold">Waiting Room</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-medium">Online</span>
        </div>
      </div>

      {/* Room Code */}
      <div className="bg-gray-900 rounded-3xl p-6 mb-5 text-center">
        <p className="text-gray-400 text-sm mb-2 uppercase tracking-widest">
          Room Code
        </p>
        <div
          data-ocid="waiting-room.room_code"
          className="text-5xl font-black text-white tracking-[0.2em] mb-4 font-mono"
        >
          {ctx.roomId}
        </div>
        <button
          type="button"
          data-ocid="waiting-room.copy_button"
          onClick={handleCopy}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            copied
              ? "bg-green-600 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-200"
          }`}
        >
          {copied ? "✓ Copied!" : "📋 Copy Code"}
        </button>
        <p className="text-gray-500 text-xs mt-3">
          Share this code with friends to join
        </p>
      </div>

      {/* Players List */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
            Players
          </p>
          <span className="text-gray-500 text-xs">{players.length}/6</span>
        </div>
        {players.length === 0 ? (
          <div
            data-ocid="waiting-room.players_empty_state"
            className="text-center py-4 text-gray-600 text-sm"
          >
            Waiting for players to join...
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((p, i) => (
              <div
                key={p.slotId}
                data-ocid={`waiting-room.player_item.${i + 1}`}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-800"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[p.slotId] }}
                >
                  {PLAYER_ANIMALS[p.slotId]}
                </div>
                <span className="text-white font-medium">{p.name}</span>
                {p.slotId === 0 && (
                  <span className="ml-auto text-xs text-yellow-400 font-bold">
                    HOST
                  </span>
                )}
                {p.slotId === ctx.mySlotId && p.slotId !== 0 && (
                  <span className="ml-auto text-xs text-blue-400 font-bold">
                    YOU
                  </span>
                )}
                {p.slotId === 0 && ctx.isHost && (
                  <span className="text-xs text-yellow-400 font-bold ml-1">
                    · YOU
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div
          data-ocid="waiting-room.error_state"
          className="mb-4 bg-red-900/50 border border-red-700 text-red-300 rounded-xl p-3 text-sm text-center"
        >
          {error}
        </div>
      )}

      {ctx.isHost ? (
        <button
          type="button"
          data-ocid="waiting-room.start_game_button"
          onClick={handleStartGame}
          disabled={starting || players.length < 2}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-lg rounded-2xl"
        >
          {starting
            ? "Starting..."
            : `Start Game (${players.length} players) 🎲`}
        </button>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">
            Waiting for host to start the game...
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Online Game Screen ────────────────────────────────────────────────────────

function OnlineGameScreen({
  initialState,
  ctx,
  _onGoHome,
}: {
  initialState: GameState;
  ctx: OnlineCtx;
  _onGoHome?: () => void;
}) {
  const { actor } = useActor();
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [rolling, setRolling] = useState(false);
  const [animatingPlayer, setAnimatingPlayer] = useState<{
    playerId: number;
    position: number;
  } | null>(null);
  const [pendingDice, setPendingDice] = useState<[number, number] | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPushingRef = useRef(false);

  const isMyTurn = gameState.currentPlayerIndex === ctx.mySlotId;

  // Poll for remote state updates
  useEffect(() => {
    const poll = async () => {
      if (isPushingRef.current) return;
      try {
        if (!actor) return;
        const room = await actor.getRoom(ctx.roomId);
        if (room.gameStateJson) {
          const remote = JSON.parse(room.gameStateJson) as GameState;
          // Only sync if the remote current player is NOT me (avoid overwriting my in-progress actions)
          if (remote.currentPlayerIndex !== ctx.mySlotId) {
            setGameState(remote);
          } else if (!isMyTurn) {
            // Switch to my turn
            setGameState(remote);
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [ctx.roomId, ctx.mySlotId, isMyTurn, actor]);

  const pushState = useCallback(
    async (newState: GameState) => {
      isPushingRef.current = true;
      setGameState(newState);
      try {
        if (actor)
          await actor.updateGameState(ctx.roomId, JSON.stringify(newState));
      } catch {}
      isPushingRef.current = false;
    },
    [ctx.roomId, actor],
  );

  const dispatch = useCallback(
    (action: Action) => {
      const newState = gameReducer(gameState, action);
      pushState(newState);
    },
    [gameState, pushState],
  );

  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, []);

  const handleRollDice = () => {
    if (rolling || !isMyTurn) return;
    setRolling(true);

    setTimeout(() => {
      setRolling(false);

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      // Show dice result before moving
      setPendingDice([d1, d2]);

      if (currentPlayer.inJail) {
        // In jail: wait 1500ms, then dispatch + clear pendingDice
        animationRef.current = setTimeout(() => {
          setPendingDice(null);
          dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
        }, 1500);
        return;
      }

      const startPos = currentPlayer.position;
      const playerId = currentPlayer.id;

      // Wait 2500ms showing the dice result, then start movement
      animationRef.current = setTimeout(() => {
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
              setPendingDice(null);
              dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
            }, 200);
          }
        };

        animationRef.current = setTimeout(stepAnimation, 80);
      }, 2500);
    }, 700);
  };

  return (
    <GameView
      state={gameState}
      dispatch={dispatch}
      rolling={rolling}
      animatingPlayer={animatingPlayer}
      pendingDice={pendingDice}
      handleRollDice={handleRollDice}
      onlineCtx={ctx}
      isMyTurn={isMyTurn}
    />
  );
}

// ── Offline Game Screen ───────────────────────────────────────────────────────

function GameScreen({
  offlineGame,
  onGoHome,
}: {
  offlineGame: ReturnType<typeof useGame>;
  onGoHome: () => void;
}) {
  const { state, dispatch } = offlineGame;
  const [rolling, setRolling] = useState(false);
  const [animatingPlayer, setAnimatingPlayer] = useState<{
    playerId: number;
    position: number;
  } | null>(null);
  const [pendingDice, setPendingDice] = useState<[number, number] | null>(null);
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

  if (state.phase === "lobby") {
    return (
      <HomeScreen
        onOffline={() => dispatch({ type: "START_SETUP" })}
        onOnline={onGoHome}
      />
    );
  }

  if (state.phase === "setup") {
    return (
      <SetupScreen
        onStart={(players) => dispatch({ type: "START_GAME", players })}
        onBack={onGoHome}
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

  const handleRollDice = () => {
    if (rolling) return;
    setRolling(true);

    setTimeout(() => {
      setRolling(false);

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2;

      const currentPlayer = state.players[state.currentPlayerIndex];

      // Show dice result before moving
      setPendingDice([d1, d2]);

      if (currentPlayer.inJail) {
        // In jail: wait 1500ms, then dispatch + clear pendingDice
        animationRef.current = setTimeout(() => {
          setPendingDice(null);
          dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
        }, 1500);
        return;
      }

      const startPos = currentPlayer.position;
      const playerId = currentPlayer.id;

      // Wait 2500ms showing the dice result, then start movement
      animationRef.current = setTimeout(() => {
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
              setPendingDice(null);
              dispatch({ type: "ROLL_DICE_PREROLLED", dice: [d1, d2] });
            }, 200);
          }
        };

        animationRef.current = setTimeout(stepAnimation, 80);
      }, 2500);
    }, 700);
  };

  return (
    <GameView
      state={state}
      dispatch={dispatch}
      rolling={rolling}
      animatingPlayer={animatingPlayer}
      pendingDice={pendingDice}
      handleRollDice={handleRollDice}
      onlineCtx={null}
      isMyTurn={true}
    />
  );
}

// ── Shared Game View ──────────────────────────────────────────────────────────

function GameView({
  state,
  dispatch,
  rolling,
  animatingPlayer,
  pendingDice,
  handleRollDice,
  onlineCtx,
  isMyTurn,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  rolling: boolean;
  animatingPlayer: { playerId: number; position: number } | null;
  pendingDice: [number, number] | null;
  handleRollDice: () => void;
  onlineCtx: OnlineCtx | null;
  isMyTurn: boolean;
}) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentSpace = currentPlayer
    ? BOARD_SPACES[currentPlayer.position]
    : null;
  const propertyToBuy = state.showPropertyCard
    ? state.properties.find((p) => p.id === state.showPropertyCard)
    : undefined;
  const auctionProperty =
    state.showAuctionPanel && state.auctionPropertyId
      ? state.properties.find((p) => p.id === state.auctionPropertyId)
      : undefined;

  if (!currentPlayer) return null;

  const waitingForName = onlineCtx && !isMyTurn ? currentPlayer.name : null;

  // Dice to display: pendingDice shows the fresh roll result; fall back to state.dice
  const displayDice = pendingDice ?? state.dice;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto relative">
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
        {onlineCtx && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-900/40 rounded-lg border border-green-700/40">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[10px] font-mono font-bold">
              {onlineCtx.roomId}
            </span>
          </div>
        )}
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
          {onlineCtx ? (
            isMyTurn ? (
              <span className="text-white font-bold text-sm bg-white/20 px-2 py-0.5 rounded-lg">
                Your Turn!
              </span>
            ) : (
              <span className="text-white/80 text-xs">Watching...</span>
            )
          ) : (
            <>
              <span className="text-white/70 text-[10px] uppercase tracking-widest font-bold">
                Turn
              </span>
              <span className="text-white text-2xl leading-none">↺</span>
              <span className="text-white/70 text-[10px] font-medium">
                Anti-clockwise
              </span>
            </>
          )}
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
          {currentPlayer.inJail ? "🔒 In Jail" : `📍 ${currentSpace?.name}`}
        </p>
        <DicePair
          dice={displayDice}
          rolling={rolling}
          tappable={isMyTurn && !state.diceRolled && !rolling}
          onClick={
            isMyTurn && !state.diceRolled && !rolling
              ? handleRollDice
              : undefined
          }
        />
        {/* Dice roll result label */}
        {pendingDice !== null && !rolling && (
          <div
            data-ocid="game.dice_roll_result"
            className="text-center py-1"
            style={{
              animation: "fadeInScale 0.25s ease-out forwards",
            }}
          >
            <span className="text-yellow-300 font-black text-2xl tracking-wide bg-yellow-400/20 rounded-xl px-4 py-2 border border-yellow-400/40 inline-block">
              🎲 Rolled {pendingDice[0] + pendingDice[1]}!
            </span>
          </div>
        )}
        <div className="flex gap-2">
          {isMyTurn && currentPlayer.inJail && !state.diceRolled && (
            <button
              type="button"
              onClick={() => dispatch({ type: "PAY_JAIL" })}
              className="flex-1 py-2.5 bg-red-700 rounded-xl font-bold text-sm"
            >
              Pay $500 Bail
            </button>
          )}
          {isMyTurn &&
            state.diceRolled &&
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
          {isMyTurn && (
            <button
              type="button"
              data-ocid="game.trade_button"
              onClick={() => dispatch({ type: "OPEN_TRADE" })}
              className="px-3 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-xl text-sm"
            >
              🤝
            </button>
          )}
          {isMyTurn && (
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_BANKING" })}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm"
            >
              🏦
            </button>
          )}
        </div>
      </div>

      {/* Waiting overlay for online mode */}
      {waitingForName && (
        <div
          data-ocid="game.waiting_overlay"
          className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 pointer-events-none"
          style={{ top: 0 }}
        >
          <div className="bg-gray-900 rounded-2xl px-8 py-6 text-center shadow-2xl border border-gray-700">
            <div className="text-4xl mb-3">
              {PLAYER_ANIMALS[currentPlayer.id] ?? "🎲"}
            </div>
            <p className="text-white font-bold text-lg mb-1">Waiting for</p>
            <p className="text-green-400 font-black text-xl mb-3">
              {waitingForName}
            </p>
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-green-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isMyTurn && propertyToBuy && (
        <PropertyCard
          property={propertyToBuy}
          playerBalance={currentPlayer.balance}
          onBuy={() => dispatch({ type: "BUY_PROPERTY" })}
          onDecline={() => dispatch({ type: "DISMISS_PROPERTY_CARD" })}
          onAuction={() => dispatch({ type: "AUCTION_PROPERTY" })}
        />
      )}

      {isMyTurn && auctionProperty && (
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
          onDismiss={() => isMyTurn && dispatch({ type: "DISMISS_CARD" })}
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

// ── Setup Screen ──────────────────────────────────────────────────────────────

const PLAYER_SLOTS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

function SetupScreen({
  onStart,
  onBack,
}: {
  onStart: (players: { name: string }[]) => void;
  onBack: () => void;
}) {
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
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          data-ocid="setup.back_button"
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ←
        </button>
        <h1 className="text-white text-2xl font-bold">Game Setup</h1>
      </div>
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

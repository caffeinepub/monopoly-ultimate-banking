import React, { useState } from "react";
import { COLOR_MAP } from "../data/board";
import type { Player, Property } from "../types/game";

interface AuctionPanelProps {
  property: Property;
  players: Player[];
  onComplete: (winnerId: number, bidAmount: number) => void;
  onCancel: () => void;
}

export function AuctionPanel({
  property,
  players,
  onComplete,
  onCancel,
}: AuctionPanelProps) {
  const color = COLOR_MAP[property.color] || "#888";
  const activePlayers = players.filter((p) => !p.bankrupt);
  const [bids, setBids] = useState<Record<number, number>>(
    Object.fromEntries(activePlayers.map((p) => [p.id, 0])),
  );

  const MIN_INCREMENT = 100;

  const adjustBid = (playerId: number, delta: number) => {
    setBids((prev) => {
      const current = prev[playerId] ?? 0;
      const next = Math.max(0, current + delta);
      const player = players[playerId];
      // cap at player's balance
      return { ...prev, [playerId]: Math.min(next, player?.balance ?? next) };
    });
  };

  const handleComplete = () => {
    let highestBid = 0;
    let winnerId = -1;
    for (const player of activePlayers) {
      const bid = bids[player.id] ?? 0;
      if (bid > highestBid) {
        highestBid = bid;
        winnerId = player.id;
      }
    }
    if (highestBid === 0 || winnerId === -1) {
      onCancel();
    } else {
      onComplete(winnerId, highestBid);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-0">
      <div className="bg-gray-900 rounded-t-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: color }}
        >
          <div>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
              Auction
            </p>
            <p className="text-white font-black text-lg leading-tight">
              {property.name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Listed At</p>
            <p className="text-white font-bold text-xl">${property.price}M</p>
          </div>
        </div>

        {/* Bid Rows */}
        <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
          <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">
            Place Bids (min increment ${MIN_INCREMENT}M)
          </p>
          {activePlayers.map((player, idx) => (
            <div
              key={player.id}
              data-ocid={`auction.player_bid.${idx + 1}`}
              className="flex items-center gap-3 bg-gray-800 rounded-2xl px-3 py-2.5"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: player.color }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">
                  {player.name}
                </p>
                <p className="text-gray-400 text-[10px] font-mono">
                  Balance: ${player.balance.toLocaleString()}M
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustBid(player.id, -MIN_INCREMENT)}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-white font-bold text-sm w-16 text-center">
                  ${(bids[player.id] ?? 0).toLocaleString()}M
                </span>
                <button
                  type="button"
                  onClick={() => adjustBid(player.id, MIN_INCREMENT)}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 flex gap-3">
          <button
            type="button"
            data-ocid="auction.cancel_button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl font-bold bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="auction.complete_button"
            onClick={handleComplete}
            className="flex-2 flex-1 py-3 rounded-2xl font-bold text-white text-sm"
            style={{ backgroundColor: color }}
          >
            🔨 Complete Auction
          </button>
        </div>
      </div>
    </div>
  );
}

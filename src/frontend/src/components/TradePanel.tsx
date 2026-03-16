import React, { useState } from "react";
import { COLOR_MAP } from "../data/board";
import type { GameState, PendingTrade } from "../types/game";

interface TradePanelProps {
  state: GameState;
  onExecute: (trade: PendingTrade) => void;
  onClose: () => void;
}

export function TradePanel({ state, onExecute, onClose }: TradePanelProps) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const otherPlayers = state.players.filter(
    (p) => p.id !== currentPlayer.id && !p.bankrupt,
  );

  const [targetPlayerId, setTargetPlayerId] = useState<number | null>(
    otherPlayers.length > 0 ? otherPlayers[0].id : null,
  );
  const [offerPropertyIds, setOfferPropertyIds] = useState<number[]>([]);
  const [offerCash, setOfferCash] = useState(0);
  const [requestPropertyIds, setRequestPropertyIds] = useState<number[]>([]);
  const [requestCash, setRequestCash] = useState(0);
  const [error, setError] = useState("");

  const targetPlayer =
    targetPlayerId !== null
      ? state.players.find((p) => p.id === targetPlayerId)
      : null;

  const myProperties = state.properties.filter(
    (p) => p.ownerId === currentPlayer.id,
  );
  const theirProperties = targetPlayer
    ? state.properties.filter((p) => p.ownerId === targetPlayer.id)
    : [];

  function toggleOfferProp(id: number) {
    setOfferPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleRequestProp(id: number) {
    setRequestPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleExecute() {
    if (targetPlayerId === null) {
      setError("Select a player to trade with");
      return;
    }
    if (offerCash < 0 || requestCash < 0) {
      setError("Cash amounts cannot be negative");
      return;
    }
    if (offerCash > currentPlayer.balance) {
      setError("You don't have enough cash to offer");
      return;
    }
    if (targetPlayer && requestCash > targetPlayer.balance) {
      setError("Target player doesn't have enough cash");
      return;
    }
    if (
      offerPropertyIds.length === 0 &&
      offerCash === 0 &&
      requestPropertyIds.length === 0 &&
      requestCash === 0
    ) {
      setError("Trade cannot be empty");
      return;
    }
    setError("");
    onExecute({
      fromPlayerId: currentPlayer.id,
      toPlayerId: targetPlayerId,
      offerPropertyIds,
      offerCash,
      requestPropertyIds,
      requestCash,
    });
  }

  function houseLabel(houses: number): string {
    if (houses === 0) return "";
    if (houses >= 5) return " 🏨";
    return ` ${"🏠".repeat(houses)}`;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="bg-gray-900 rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">🤝 Trade</h2>
          <button
            type="button"
            data-ocid="trade.cancel_button"
            onClick={onClose}
            className="text-gray-400 text-2xl leading-none hover:text-white"
          >
            &times;
          </button>
        </div>

        <p className="text-green-400 font-bold text-sm mb-4">
          {currentPlayer.name} — ${currentPlayer.balance.toLocaleString()}M
        </p>

        {/* Target Player Select */}
        <div className="mb-4">
          <label
            htmlFor="trade-target-player"
            className="text-gray-400 text-xs mb-1 block"
          >
            Trade with
          </label>
          <select
            id="trade-target-player"
            data-ocid="trade.player_select"
            value={targetPlayerId ?? ""}
            onChange={(e) => {
              setTargetPlayerId(Number(e.target.value));
              setRequestPropertyIds([]);
            }}
            className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 text-sm"
          >
            {otherPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${p.balance.toLocaleString()}M
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Your Offer */}
          <div>
            <p className="text-yellow-400 font-semibold text-xs mb-2">
              Your Offer
            </p>
            {myProperties.length === 0 ? (
              <p className="text-gray-600 text-xs">No properties</p>
            ) : (
              <div className="space-y-1 mb-2">
                {myProperties.map((prop) => {
                  const color = COLOR_MAP[prop.color] || "#888";
                  const checked = offerPropertyIds.includes(prop.id);
                  const checkId = `offer-prop-${prop.id}`;
                  return (
                    <label
                      key={prop.id}
                      htmlFor={checkId}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer text-xs ${
                        checked ? "bg-yellow-900/40" : "bg-gray-800"
                      }`}
                    >
                      <input
                        id={checkId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOfferProp(prop.id)}
                        className="accent-yellow-400"
                      />
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-white truncate">
                        {prop.name}
                        {houseLabel(prop.houses)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <label
              htmlFor="trade-offer-cash"
              className="text-gray-400 text-xs block mb-1"
            >
              Cash offer ($M)
            </label>
            <input
              id="trade-offer-cash"
              data-ocid="trade.offer_cash_input"
              type="number"
              min={0}
              value={offerCash}
              onChange={(e) =>
                setOfferCash(Math.max(0, Number(e.target.value)))
              }
              className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-700 focus:outline-none focus:border-yellow-500"
            />
          </div>

          {/* Their Request */}
          <div>
            <p className="text-blue-400 font-semibold text-xs mb-2">
              You Request
            </p>
            {theirProperties.length === 0 ? (
              <p className="text-gray-600 text-xs">No properties</p>
            ) : (
              <div className="space-y-1 mb-2">
                {theirProperties.map((prop) => {
                  const color = COLOR_MAP[prop.color] || "#888";
                  const checked = requestPropertyIds.includes(prop.id);
                  const checkId = `request-prop-${prop.id}`;
                  return (
                    <label
                      key={prop.id}
                      htmlFor={checkId}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer text-xs ${
                        checked ? "bg-blue-900/40" : "bg-gray-800"
                      }`}
                    >
                      <input
                        id={checkId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRequestProp(prop.id)}
                        className="accent-blue-400"
                      />
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-white truncate">
                        {prop.name}
                        {houseLabel(prop.houses)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <label
              htmlFor="trade-request-cash"
              className="text-gray-400 text-xs block mb-1"
            >
              Cash request ($M)
            </label>
            <input
              id="trade-request-cash"
              data-ocid="trade.request_cash_input"
              type="number"
              min={0}
              value={requestCash}
              onChange={(e) =>
                setRequestCash(Math.max(0, Number(e.target.value)))
              }
              className="w-full bg-gray-800 text-white rounded-lg px-2 py-1.5 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Trade Summary */}
        {(offerPropertyIds.length > 0 ||
          offerCash > 0 ||
          requestPropertyIds.length > 0 ||
          requestCash > 0) && (
          <div className="bg-gray-800/60 rounded-xl p-3 mb-3 text-xs">
            <p className="text-gray-400 font-semibold mb-1">Trade Summary</p>
            <p className="text-yellow-300">
              {currentPlayer.name} gives:{" "}
              {[
                ...offerPropertyIds.map(
                  (id) => state.properties.find((p) => p.id === id)?.name,
                ),
                offerCash > 0 ? `$${offerCash}M cash` : null,
              ]
                .filter(Boolean)
                .join(", ") || "nothing"}
            </p>
            <p className="text-blue-300">
              {targetPlayer?.name} gives:{" "}
              {[
                ...requestPropertyIds.map(
                  (id) => state.properties.find((p) => p.id === id)?.name,
                ),
                requestCash > 0 ? `$${requestCash}M cash` : null,
              ]
                .filter(Boolean)
                .join(", ") || "nothing"}
            </p>
          </div>
        )}

        {error && (
          <p
            data-ocid="trade.error_state"
            className="text-red-400 text-xs mb-3 text-center"
          >
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="trade.cancel_button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="trade.execute_button"
            onClick={handleExecute}
            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm"
          >
            Make Trade 🤝
          </button>
        </div>
      </div>
    </div>
  );
}

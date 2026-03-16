import React from "react";
import { COLOR_MAP } from "../data/board";
import { HOUSE_COST } from "../hooks/useGame";
import type { GameState } from "../types/game";

interface BankingPanelProps {
  state: GameState;
  onMortgage: (id: number) => void;
  onUnmortgage: (id: number) => void;
  onBuyHouse: (id: number) => void;
  onSellHouse: (id: number) => void;
  onClose: () => void;
}

export function BankingPanel({
  state,
  onMortgage,
  onUnmortgage,
  onBuyHouse,
  onSellHouse,
  onClose,
}: BankingPanelProps) {
  const player = state.players[state.currentPlayerIndex];
  const myProperties = state.properties.filter((p) => p.ownerId === player.id);

  function canBuyHouse(propId: number): boolean {
    const prop = state.properties.find((p) => p.id === propId);
    if (!prop) return false;
    if (prop.mortgaged || prop.houses >= 5) return false;
    const cost = HOUSE_COST[prop.color];
    if (cost === undefined) return false;
    if (player.balance < cost) return false;
    const colorGroup = state.properties.filter((p) => p.color === prop.color);
    return colorGroup.every((p) => p.ownerId === player.id);
  }

  function houseLabel(houses: number): string {
    if (houses === 0) return "";
    if (houses >= 5) return "🏨 Hotel";
    return "🏠".repeat(houses);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50">
      <div className="bg-gray-900 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-bold text-lg">
            Banking — {player.name}
          </h2>
          <button
            type="button"
            data-ocid="banking.close_button"
            onClick={onClose}
            className="text-gray-400 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <p className="text-green-400 font-bold text-base mb-4">
          Balance: ${player.balance.toLocaleString()}M
        </p>
        {myProperties.length === 0 ? (
          <p
            data-ocid="banking.empty_state"
            className="text-gray-500 text-center py-8"
          >
            No properties owned
          </p>
        ) : (
          <div className="space-y-2">
            {myProperties.map((prop) => {
              const color = COLOR_MAP[prop.color] || "#888";
              const houseCost = HOUSE_COST[prop.color];
              const canBuy = canBuyHouse(prop.id);
              const canSell = prop.houses > 0;
              return (
                <div
                  key={prop.id}
                  className="bg-gray-800 rounded-xl p-3 flex items-start gap-3"
                >
                  <div
                    className="w-[3px] rounded self-stretch flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm leading-tight">
                      {prop.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {prop.mortgaged ? "🔴 Mortgaged" : `$${prop.price}M`}
                    </p>
                    {prop.houses > 0 && (
                      <p className="text-yellow-400 text-xs mt-[2px]">
                        {houseLabel(prop.houses)}
                      </p>
                    )}
                    {houseCost && !prop.mortgaged && (
                      <p className="text-gray-500 text-[10px]">
                        House: ${houseCost}M
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!prop.mortgaged ? (
                      <button
                        type="button"
                        data-ocid="banking.mortgage_button"
                        onClick={() => onMortgage(prop.id)}
                        className="bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs"
                      >
                        Mortgage
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-ocid="banking.unmortgage_button"
                        onClick={() => onUnmortgage(prop.id)}
                        className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-lg text-xs"
                      >
                        Unmortgage
                      </button>
                    )}
                    {canBuy && (
                      <button
                        type="button"
                        data-ocid="banking.buy_house_button"
                        onClick={() => onBuyHouse(prop.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs"
                      >
                        {prop.houses >= 4 ? "🏨 Hotel" : "🏠 House"}
                      </button>
                    )}
                    {canSell && (
                      <button
                        type="button"
                        data-ocid="banking.sell_house_button"
                        onClick={() => onSellHouse(prop.id)}
                        className="bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded-lg text-xs"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

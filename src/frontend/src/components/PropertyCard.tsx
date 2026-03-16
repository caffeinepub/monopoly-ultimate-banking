import React from "react";
import { COLOR_MAP } from "../data/board";
import type { Property } from "../types/game";

interface PropertyCardProps {
  property: Property;
  onBuy: () => void;
  onDecline: () => void;
  playerBalance: number;
}

export function PropertyCard({
  property,
  onBuy,
  onDecline,
  playerBalance,
}: PropertyCardProps) {
  const color = COLOR_MAP[property.color] || "#888";
  const canAfford = playerBalance >= property.price;

  const rentRows =
    property.color === "railroad"
      ? [
          { label: "1 Railroad", value: `$${property.rent[0]}M` },
          { label: "2 Railroads", value: `$${property.rent[1]}M` },
          { label: "3 Railroads", value: `$${property.rent[2]}M` },
          { label: "4 Railroads", value: `$${property.rent[3]}M` },
        ]
      : property.color === "utility"
        ? [
            { label: "1 Utility", value: "4× dice" },
            { label: "2 Utilities", value: "10× dice" },
          ]
        : [
            { label: "Base Rent", value: `$${property.rent[0]}M` },
            {
              label: "Monopoly (no houses)",
              value: `$${property.rent[0] * 2}M`,
            },
            { label: "1 House", value: `$${property.rent[1]}M` },
            { label: "2 Houses", value: `$${property.rent[2]}M` },
            { label: "3 Houses", value: `$${property.rent[3]}M` },
            { label: "4 Houses", value: `$${property.rent[4]}M` },
            { label: "🏨 Hotel", value: `$${property.rent[5]}M` },
          ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
        <div
          className="h-14 flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span className="text-white font-bold text-base text-center px-4">
            {property.name}
          </span>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Price</span>
            <span className="text-white font-bold text-xl">
              ${property.price}M
            </span>
          </div>

          <div>
            <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">
              Rent Schedule
            </p>
            <div className="space-y-[3px]">
              {rentRows.map((row) => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="text-gray-200 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              data-ocid="game.buy_property_button"
              onClick={onBuy}
              disabled={!canAfford}
              className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-40 text-sm"
              style={{ backgroundColor: color }}
            >
              Buy ${property.price}M
            </button>
            <button
              type="button"
              data-ocid="game.auction_button"
              onClick={onDecline}
              className="flex-1 py-3 rounded-xl font-bold bg-gray-700 text-gray-200 text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

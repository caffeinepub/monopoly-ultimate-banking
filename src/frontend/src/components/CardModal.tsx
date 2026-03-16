import React from "react";
import type { CardModal as CardModalType } from "../types/game";

interface CardModalProps {
  card: CardModalType;
  playerName: string;
  onDismiss: () => void;
}

export function CardModal({ card, playerName, onDismiss }: CardModalProps) {
  const isChance = card.cardType === "chance";
  const isPositive = card.amount >= 0;

  return (
    <div
      data-ocid="card.modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: isChance
            ? "linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)"
            : "linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #60a5fa 100%)",
        }}
      >
        {/* Card header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="text-5xl mb-2">{isChance ? "?" : "🏘"}</div>
          <h2 className="text-white font-black text-xl tracking-widest uppercase">
            {isChance ? "Chance" : "Community Chest"}
          </h2>
        </div>

        {/* Card body */}
        <div className="bg-white/95 mx-4 rounded-2xl px-5 py-5 mb-4">
          <p className="text-gray-800 text-center font-semibold text-base leading-snug mb-4">
            {card.title}
          </p>

          {/* Amount badge */}
          <div className="flex justify-center mb-3">
            <span
              className="px-5 py-2 rounded-full font-black text-xl"
              style={{
                backgroundColor: isPositive ? "#dcfce7" : "#fee2e2",
                color: isPositive ? "#15803d" : "#b91c1c",
              }}
            >
              {isPositive ? "+" : ""}
              {card.amount < 0 ? "-" : ""}${Math.abs(card.amount)}
            </span>
          </div>

          {/* Player name */}
          <p className="text-center text-gray-500 text-sm">
            {playerName}
            {isPositive ? " receives" : " pays"}
          </p>
        </div>

        {/* Dismiss button */}
        <div className="px-4 pb-6">
          <button
            type="button"
            data-ocid="card.close_button"
            onClick={onDismiss}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-transform active:scale-95"
            style={{
              backgroundColor: isChance
                ? "rgba(0,0,0,0.25)"
                : "rgba(0,0,0,0.25)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            OK — Got It!
          </button>
        </div>
      </div>
    </div>
  );
}

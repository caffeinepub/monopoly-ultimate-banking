import { useCallback, useReducer } from "react";
import { BOARD_SPACES, PLAYER_COLORS, PROPERTIES } from "../data/board";
import type {
  CardModal,
  GameState,
  PendingTrade,
  Player,
  Property,
  PropertyColor,
} from "../types/game";

const STARTING_BALANCE = 15000;
const GO_SALARY = 2000;
const JAIL_POSITION = 10;

const HOUSE_COST: Partial<Record<PropertyColor, number>> = {
  brown: 50,
  "light-blue": 50,
  pink: 100,
  orange: 100,
  red: 150,
  yellow: 150,
  green: 200,
  "dark-blue": 200,
};

const CHANCE_CARDS = [
  { title: "Bank pays you dividend of $500", amount: 500 },
  { title: "Pay poor tax of $150", amount: -150 },
  { title: "You won a crossword competition! Collect $100", amount: 100 },
  { title: "Pay school fees of $150", amount: -150 },
  { title: "Receive $150 for services rendered", amount: 150 },
  { title: "Bank error in your favor — Collect $200", amount: 200 },
  { title: "Pay hospital fees of $100", amount: -100 },
  { title: "Income tax refund — Collect $20", amount: 20 },
  { title: "Speeding fine — Pay $15", amount: -15 },
  { title: "Pay income tax of $200", amount: -200 },
  { title: "Building loan matures — Collect $150", amount: 150 },
  { title: "Your stock investment pays off — Collect $50", amount: 50 },
];

const COMMUNITY_CARDS = [
  { title: "Holiday fund matures — Receive $100", amount: 100 },
  { title: "Doctor's fee — Pay $50", amount: -50 },
  { title: "From sale of stock you get $45", amount: 45 },
  { title: "Pay hospital $100", amount: -100 },
  { title: "Receive $25 consultancy fee", amount: 25 },
  { title: "You inherit $100", amount: 100 },
  { title: "Pay school fees of $200", amount: -200 },
  { title: "Receive for services — Collect $25", amount: 25 },
  { title: "Life insurance matures — Collect $100", amount: 100 },
  { title: "Pay for repairs — $40", amount: -40 },
  { title: "Grand opera night — Collect $50", amount: 50 },
  { title: "Bank error in your favor — Collect $200", amount: 200 },
];

function initProperties(): Property[] {
  return PROPERTIES.map((p) => ({ ...p }));
}

function createInitialState(): GameState {
  return {
    phase: "lobby",
    players: [],
    properties: initProperties(),
    currentPlayerIndex: 0,
    dice: [1, 1],
    diceRolled: false,
    message: "",
    showTradePanel: false,
    showBankingPanel: false,
  };
}

type Action =
  | { type: "START_SETUP" }
  | { type: "START_GAME"; players: { name: string }[] }
  | { type: "ROLL_DICE" }
  | { type: "ROLL_DICE_PREROLLED"; dice: [number, number] }
  | { type: "BUY_PROPERTY" }
  | { type: "END_TURN" }
  | { type: "PAY_JAIL" }
  | { type: "MORTGAGE"; propertyId: number }
  | { type: "UNMORTGAGE"; propertyId: number }
  | { type: "TOGGLE_BANKING" }
  | { type: "PLAY_AGAIN" }
  | { type: "DISMISS_PROPERTY_CARD" }
  | { type: "BUILD_HOUSE"; propertyId: number }
  | { type: "SELL_HOUSE"; propertyId: number }
  | { type: "OPEN_TRADE" }
  | { type: "CLOSE_TRADE" }
  | { type: "SET_TRADE"; trade: PendingTrade }
  | { type: "EXECUTE_TRADE"; trade: PendingTrade }
  | { type: "DISMISS_CARD" };

function getRent(
  property: Property,
  properties: Property[],
  diceTotal: number,
): number {
  if (property.mortgaged) return 0;
  if (property.color === "railroad") {
    const ownedRailroads = properties.filter(
      (p) => p.color === "railroad" && p.ownerId === property.ownerId,
    ).length;
    return property.rent[Math.min(ownedRailroads - 1, 3)];
  }
  if (property.color === "utility") {
    const ownedUtilities = properties.filter(
      (p) => p.color === "utility" && p.ownerId === property.ownerId,
    ).length;
    return property.rent[ownedUtilities - 1] * diceTotal;
  }
  const colorGroup = properties.filter((p) => p.color === property.color);
  const ownsAll = colorGroup.every((p) => p.ownerId === property.ownerId);
  if (property.houses === 0 && ownsAll) return property.rent[0] * 2;
  return property.rent[Math.min(property.houses, property.rent.length - 1)];
}

function advanceToNext(state: GameState): GameState {
  const active = state.players.filter((p) => !p.bankrupt);
  if (active.length <= 1) {
    const winner = active[0];
    return {
      ...state,
      phase: "ended",
      winner: winner?.id,
      message: winner ? `${winner.name} wins!` : "Game over!",
    };
  }
  let next = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[next].bankrupt) {
    next = (next + 1) % state.players.length;
  }
  return {
    ...state,
    currentPlayerIndex: next,
    diceRolled: false,
    message: `${state.players[next].name}'s turn`,
  };
}

function applyDiceRoll(state: GameState, d1: number, d2: number): GameState {
  if (state.diceRolled) return state;
  const total = d1 + d2;
  const players = [...state.players];
  const player = { ...players[state.currentPlayerIndex] };

  if (player.inJail) {
    if (d1 === d2) {
      player.inJail = false;
      player.jailTurns = 0;
    } else {
      player.jailTurns += 1;
      if (player.jailTurns >= 3) {
        player.balance -= 500;
        player.inJail = false;
        player.jailTurns = 0;
      }
      players[state.currentPlayerIndex] = player;
      return {
        ...state,
        dice: [d1, d2],
        diceRolled: true,
        players,
        message: player.inJail
          ? `${player.name} is still in Jail`
          : `${player.name} paid $500 fine`,
      };
    }
  }

  const oldPos = player.position;
  const newPos = (oldPos + total) % 40;
  let msg = "";

  if (newPos < oldPos || oldPos + total >= 40) {
    player.balance += GO_SALARY;
    msg += `Passed GO! Collected $${GO_SALARY}. `;
  }

  player.position = newPos;
  players[state.currentPlayerIndex] = player;
  const properties = [...state.properties];

  const space = BOARD_SPACES[newPos];
  let showPropertyCard: number | undefined = undefined;
  let showCardModal: CardModal | undefined = undefined;

  if (space.type === "go-to-jail") {
    player.inJail = true;
    player.position = JAIL_POSITION;
    players[state.currentPlayerIndex] = player;
    msg += "Go to Jail!";
    return {
      ...state,
      dice: [d1, d2],
      diceRolled: true,
      players,
      properties,
      message: msg,
    };
  }

  if (space.type === "tax") {
    player.balance -= space.taxAmount || 0;
    if (player.balance < 0) player.bankrupt = true;
    players[state.currentPlayerIndex] = player;
    msg += `Paid $${space.taxAmount} tax.`;
  } else if (space.type === "chance") {
    const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
    player.balance += card.amount;
    if (player.balance < 0) player.bankrupt = true;
    players[state.currentPlayerIndex] = player;
    showCardModal = {
      cardType: "chance",
      title: card.title,
      amount: card.amount,
    };
    msg += card.title;
  } else if (space.type === "community-chest") {
    const card =
      COMMUNITY_CARDS[Math.floor(Math.random() * COMMUNITY_CARDS.length)];
    player.balance += card.amount;
    if (player.balance < 0) player.bankrupt = true;
    players[state.currentPlayerIndex] = player;
    showCardModal = {
      cardType: "community-chest",
      title: card.title,
      amount: card.amount,
    };
    msg += card.title;
  } else if (
    space.type === "property" ||
    space.type === "railroad" ||
    space.type === "utility"
  ) {
    const prop = properties.find((p) => p.id === space.propertyId);
    if (prop) {
      if (prop.ownerId === undefined) {
        showPropertyCard = prop.id;
        msg += `Landed on ${prop.name} ($${prop.price})`;
      } else if (prop.ownerId !== player.id) {
        const owner = players[prop.ownerId];
        const rent = getRent(prop, properties, total);
        player.balance -= rent;
        if (player.balance < 0) player.bankrupt = true;
        players[prop.ownerId] = { ...owner, balance: owner.balance + rent };
        players[state.currentPlayerIndex] = player;
        msg += `Paid $${rent} rent to ${owner.name}`;
      } else {
        msg += `You own ${prop.name}`;
      }
    }
  } else if (space.type === "free-parking") {
    msg += "Free Parking - nothing happens";
  } else if (space.type === "go") {
    msg += "Landed on GO!";
  } else if (space.type === "visiting") {
    msg += "Just Visiting";
  }

  players[state.currentPlayerIndex] = player;
  return {
    ...state,
    dice: [d1, d2],
    diceRolled: true,
    players,
    properties,
    message: msg,
    showPropertyCard,
    showCardModal,
  };
}

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_SETUP":
      return { ...state, phase: "setup" };

    case "START_GAME": {
      const players: Player[] = action.players.map((p, i) => ({
        id: i,
        name: p.name,
        balance: STARTING_BALANCE,
        position: 0,
        color: PLAYER_COLORS[i],
        inJail: false,
        jailTurns: 0,
        bankrupt: false,
        propertyIds: [],
        getOutOfJailCards: 0,
      }));
      return {
        ...createInitialState(),
        phase: "playing",
        players,
        message: `${players[0].name}'s turn`,
      };
    }

    case "ROLL_DICE": {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      return applyDiceRoll(state, d1, d2);
    }

    case "ROLL_DICE_PREROLLED": {
      return applyDiceRoll(state, action.dice[0], action.dice[1]);
    }

    case "BUY_PROPERTY": {
      if (!state.showPropertyCard) return state;
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      const properties = state.properties.map((p) =>
        p.id === state.showPropertyCard ? { ...p, ownerId: player.id } : p,
      );
      const prop = properties.find((p) => p.id === state.showPropertyCard)!;
      player.balance -= prop.price;
      player.propertyIds = [...player.propertyIds, prop.id];
      if (player.balance < 0) player.bankrupt = true;
      players[state.currentPlayerIndex] = player;
      return {
        ...state,
        players,
        properties,
        showPropertyCard: undefined,
        message: `${player.name} bought ${prop.name}`,
      };
    }

    case "DISMISS_PROPERTY_CARD":
      return { ...state, showPropertyCard: undefined };

    case "DISMISS_CARD":
      return { ...state, showCardModal: undefined };

    case "END_TURN":
      return advanceToNext({
        ...state,
        showPropertyCard: undefined,
        showCardModal: undefined,
        showBankingPanel: false,
        showTradePanel: false,
        pendingTrade: undefined,
      });

    case "PAY_JAIL": {
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      player.balance -= 500;
      player.inJail = false;
      player.jailTurns = 0;
      if (player.balance < 0) player.bankrupt = true;
      players[state.currentPlayerIndex] = player;
      return {
        ...state,
        players,
        diceRolled: false,
        message: `${player.name} paid $500 to leave Jail`,
      };
    }

    case "MORTGAGE": {
      const properties = state.properties.map((p) =>
        p.id === action.propertyId ? { ...p, mortgaged: true } : p,
      );
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      const prop = properties.find((p) => p.id === action.propertyId)!;
      player.balance += Math.floor(prop.price / 2);
      players[state.currentPlayerIndex] = player;
      return {
        ...state,
        properties,
        players,
        message: `Mortgaged ${prop.name} for $${Math.floor(prop.price / 2)}`,
      };
    }

    case "UNMORTGAGE": {
      const prop = state.properties.find((p) => p.id === action.propertyId)!;
      const cost = Math.floor(prop.price * 0.55);
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      if (player.balance < cost)
        return { ...state, message: "Not enough money!" };
      player.balance -= cost;
      players[state.currentPlayerIndex] = player;
      const properties = state.properties.map((p) =>
        p.id === action.propertyId ? { ...p, mortgaged: false } : p,
      );
      return {
        ...state,
        properties,
        players,
        message: `Unmortgaged ${prop.name} for $${cost}`,
      };
    }

    case "BUILD_HOUSE": {
      const prop = state.properties.find((p) => p.id === action.propertyId);
      if (!prop) return state;
      const cost = HOUSE_COST[prop.color];
      if (cost === undefined)
        return { ...state, message: "Cannot build on this property" };
      if (prop.mortgaged) return { ...state, message: "Property is mortgaged" };
      if (prop.houses >= 5) return { ...state, message: "Already has a hotel" };

      const colorGroup = state.properties.filter((p) => p.color === prop.color);
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      const ownsAll = colorGroup.every((p) => p.ownerId === player.id);
      if (!ownsAll)
        return { ...state, message: "Must own full color group to build" };
      if (player.balance < cost)
        return { ...state, message: "Not enough money to build" };

      player.balance -= cost;
      players[state.currentPlayerIndex] = player;
      const properties = state.properties.map((p) =>
        p.id === action.propertyId ? { ...p, houses: p.houses + 1 } : p,
      );
      const builtLabel =
        prop.houses + 1 >= 5 ? "Hotel" : `House (${prop.houses + 1})`;
      return {
        ...state,
        properties,
        players,
        message: `Built ${builtLabel} on ${prop.name} for $${cost}`,
      };
    }

    case "SELL_HOUSE": {
      const prop = state.properties.find((p) => p.id === action.propertyId);
      if (!prop || prop.houses <= 0)
        return { ...state, message: "No houses to sell" };
      const cost = HOUSE_COST[prop.color];
      if (cost === undefined) return state;
      const refund = Math.floor(cost / 2);
      const players = [...state.players];
      const player = { ...players[state.currentPlayerIndex] };
      player.balance += refund;
      players[state.currentPlayerIndex] = player;
      const properties = state.properties.map((p) =>
        p.id === action.propertyId ? { ...p, houses: p.houses - 1 } : p,
      );
      return {
        ...state,
        properties,
        players,
        message: `Sold house on ${prop.name}, received $${refund}`,
      };
    }

    case "TOGGLE_BANKING":
      return { ...state, showBankingPanel: !state.showBankingPanel };

    case "OPEN_TRADE":
      return { ...state, showTradePanel: true, showBankingPanel: false };

    case "CLOSE_TRADE":
      return { ...state, showTradePanel: false, pendingTrade: undefined };

    case "SET_TRADE":
      return { ...state, pendingTrade: action.trade };

    case "EXECUTE_TRADE": {
      const trade = action.trade;
      const players = state.players.map((p) => ({ ...p }));
      const fromPlayer = players[trade.fromPlayerId];
      const toPlayer = players[trade.toPlayerId];

      if (!fromPlayer || !toPlayer)
        return { ...state, message: "Invalid trade" };
      if (fromPlayer.balance < trade.offerCash)
        return { ...state, message: "Not enough cash to offer" };
      if (toPlayer.balance < trade.requestCash)
        return { ...state, message: "Target player doesn't have enough cash" };

      // Transfer cash
      fromPlayer.balance =
        fromPlayer.balance - trade.offerCash + trade.requestCash;
      toPlayer.balance = toPlayer.balance - trade.requestCash + trade.offerCash;

      // Transfer properties
      const properties = state.properties.map((p) => {
        if (trade.offerPropertyIds.includes(p.id)) {
          // from -> to
          fromPlayer.propertyIds = fromPlayer.propertyIds.filter(
            (id) => id !== p.id,
          );
          toPlayer.propertyIds = [...toPlayer.propertyIds, p.id];
          return { ...p, ownerId: toPlayer.id };
        }
        if (trade.requestPropertyIds.includes(p.id)) {
          // to -> from
          toPlayer.propertyIds = toPlayer.propertyIds.filter(
            (id) => id !== p.id,
          );
          fromPlayer.propertyIds = [...fromPlayer.propertyIds, p.id];
          return { ...p, ownerId: fromPlayer.id };
        }
        return p;
      });

      return {
        ...state,
        players,
        properties,
        showTradePanel: false,
        pendingTrade: undefined,
        message: `Trade complete between ${fromPlayer.name} and ${toPlayer.name}`,
      };
    }

    case "PLAY_AGAIN":
      return createInitialState();

    default:
      return state;
  }
}

const STORAGE_KEY = "monopoly_game_state";

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as GameState;
  } catch {}
  return createInitialState();
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState);
  const savedDispatch = useCallback((action: Action) => {
    dispatch(action);
  }, []);
  return { state, dispatch: savedDispatch };
}

export { HOUSE_COST };
export type { Action };

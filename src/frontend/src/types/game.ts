export type PropertyColor =
  | "brown"
  | "light-blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue"
  | "railroad"
  | "utility"
  | "special";

export interface Property {
  id: number;
  name: string;
  color: PropertyColor;
  price: number;
  rent: number[];
  ownerId?: number;
  mortgaged: boolean;
  houses: number;
}

export interface BoardSpace {
  id: number;
  name: string;
  type:
    | "property"
    | "railroad"
    | "utility"
    | "go"
    | "jail"
    | "free-parking"
    | "go-to-jail"
    | "tax"
    | "chance"
    | "community-chest"
    | "visiting";
  propertyId?: number;
  taxAmount?: number;
  color?: PropertyColor;
}

export interface Player {
  id: number;
  name: string;
  balance: number;
  position: number;
  color: string;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  propertyIds: number[];
  getOutOfJailCards: number;
}

export type GamePhase = "lobby" | "setup" | "playing" | "ended";

export interface PendingTrade {
  fromPlayerId: number;
  toPlayerId: number;
  offerPropertyIds: number[];
  offerCash: number;
  requestPropertyIds: number[];
  requestCash: number;
}

export interface CardModal {
  cardType: "chance" | "community-chest";
  title: string;
  amount: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  properties: Property[];
  currentPlayerIndex: number;
  dice: [number, number];
  diceRolled: boolean;
  message: string;
  winner?: number;
  showPropertyCard?: number;
  showTradePanel: boolean;
  showBankingPanel: boolean;
  pendingTrade?: PendingTrade;
  showCardModal?: CardModal;
  showAuctionPanel?: boolean;
  auctionPropertyId?: number;
}

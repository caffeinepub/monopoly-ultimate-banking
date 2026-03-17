import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    principal: Principal;
    name: string;
    slotId: bigint;
}
export type CreateRoomResult = {
    __kind__: "createFailed";
    createFailed: null;
} | {
    __kind__: "permissionDenied";
    permissionDenied: null;
} | {
    __kind__: "invalidHostName";
    invalidHostName: {
    };
} | {
    __kind__: "roomInUse";
    roomInUse: null;
} | {
    __kind__: "success";
    success: string;
} | {
    __kind__: "roomIdAlreadyExists";
    roomIdAlreadyExists: null;
} | {
    __kind__: "notSupported";
    notSupported: null;
} | {
    __kind__: "unavailable";
    unavailable: null;
};
export type Success = {
    __kind__: "ok";
    ok: {
        code: string;
        slotId: bigint;
    };
};
export interface Room {
    code: string;
    createdAt: bigint;
    gameStateJson: string;
    players: Array<Player>;
    phase: string;
    hostSlotId: bigint;
    maxPlayers: bigint;
}
export interface UserProfile {
    name: string;
}
export interface CreateRoomInput {
    hostName: string;
    roomId?: string;
    maxPlayers: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cleanupOldRooms(): Promise<void>;
    createRoom(arg0: CreateRoomInput): Promise<CreateRoomResult>;
    getAllRooms(): Promise<Array<[string, Room]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getRoom(roomId: string): Promise<Room>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    joinRoom(roomId: string, playerName: string): Promise<Success>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startGame(roomId: string): Promise<void>;
    updateGameState(roomId: string, gameStateJson: string): Promise<void>;
}

import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";

import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile System
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Room Management Types
  type Player = {
    name : Text;
    slotId : Nat;
    principal : Principal;
  };

  type Room = {
    code : Text;
    players : [Player];
    gameStateJson : Text;
    phase : Text; // "waiting", "playing", "ended"
    hostSlotId : Nat;
    createdAt : Int;
    maxPlayers : Nat;
  };

  module JoinRoomResult {
    public type Success = {
      #ok : {
        slotId : Nat;
        code : Text;
      };
    };
    public type InvalidRoomId = { #invalidRoomId : {} };
    public type RoomFull = { #roomFull : {} };
    public type GameAlreadyStarted = { #gameAlreadyStarted };
    public type InvalidSlotCount = { #invalidSlotCount };
    public type RoomExpired = { #roomExpired };
    public type RoomEnded = { #roomEnded };
    public type RoomInactive = { #roomInactive };
    public type PhaseTransition = { #phaseTransition };
    public type PlayerLimitExceeded = { #playerLimitExceeded };
    public type DuplicatedName = { #duplicatedName };
    public type RoomNotFound = { #roomNotFound };
    public type InactiveRoomFound = { #inactiveRoomFound };
    public type ExpiredRoomRemoved = { #expiredRoomRemoved };
    public type RoomReadonly = { #roomReadonly };
    public type RoomPermissionDenied = { #roomPermissionDenied };
    public type RoomPhaseTransition = { #roomPhaseTransition };
  };

  let rooms = Map.empty<Text, Room>();

  public type CreateRoomResult = {
    #success : Text;
    #invalidHostName : {};
    #roomIdAlreadyExists;
    #createFailed;
    #roomInUse;
    #unavailable;
    #notSupported;
    #permissionDenied;
  };

  public type CreateRoomInput = {
    hostName : Text;
    roomId : ?Text;
    maxPlayers : Nat;
  };

  func isValidRoomId(code : Text) : Bool {
    let len = code.size();
    if (len < 3 or len > 6) {
      return false;
    };
    code.chars().all(
      func(c) {
        (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z')
      }
    );
  };

  func generateUniqueRoomId(attemptedId : ?Text) : Text {
    switch (attemptedId) {
      case (?id) {
        if (isValidRoomId(id) and not rooms.containsKey(id)) {
          return id;
        };
      };
      case (_) {};
    };
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    func randomCode(size : Nat) : Text {
      let code = Text.fromIter(chars.chars().take(size));
      if (rooms.containsKey(code)) {
        randomCode(size + 1);
      } else { code };
    };
    randomCode(6);
  };

  let defaultMaxPlayers = 6;
  let minEnumPlayers = 2;
  let maxEnumPlayers = 8;

  func isValidEnumPlayers(enumPlayers : Nat) : Bool {
    enumPlayers >= minEnumPlayers and (enumPlayers <= maxEnumPlayers);
  };

  func mapDefaultSlotsToRange(players : [Player], maxSlots : Nat) : [Player] {
    players.map<Player, Player>(func(p) { { p with slotId = p.slotId % maxSlots } });
  };

  public type PlayerSlotFiltered = {
    slotId : Nat;
    name : Text;
  };

  func getAllPlayersCountFiltered(players : [Player]) : [Player] {
    players.filter(func(player) { player.name.size() > 0 });
  };

  func getFreeSlot(players : [Player], maxPlayers : Nat) : Nat {
    let occupiedSlots = players.map(func(p) { p.slotId });
    for (i in Nat.range(0, maxPlayers - 1)) {
      if (not occupiedSlots.find(func(slot) { slot == i }).isSome()) { return i };
    };
    Runtime.trap("No valid slots left");
  };

  // Join a room - no authentication required, anyone can play
  public shared ({ caller }) func joinRoom(roomId : Text, playerName : Text) : async JoinRoomResult.Success {
    switch (rooms.get(roomId)) {
      case (?room) {
        if (room.phase == "playing") { Runtime.trap("Game already started!") };
        let filteredPlayers = getAllPlayersCountFiltered(room.players);

        if (filteredPlayers.size() >= defaultMaxPlayers) {
          Runtime.trap("This room is full!");
        };

        let trimmedName = Text.fromIter(playerName.chars().take(10));
        if (trimmedName.isEmpty()) { Runtime.trap("Name cannot be empty") };

        // Check for duplicate names
        if (filteredPlayers.values().any(func(p) { Text.equal(p.name, trimmedName) })) {
          Runtime.trap("This name already exists");
        };

        let slotId : Nat = getFreeSlot(filteredPlayers, defaultMaxPlayers);

        let newPlayer : Player = {
          name = trimmedName;
          slotId;
          principal = caller;
        };
        let newPlayers = filteredPlayers.concat([newPlayer]);
        let updatedRoom : Room = {
          code = room.code;
          players = mapDefaultSlotsToRange(newPlayers, defaultMaxPlayers);
          gameStateJson = room.gameStateJson;
          phase = room.phase;
          hostSlotId = room.hostSlotId;
          createdAt = room.createdAt;
          maxPlayers = room.maxPlayers;
        };

        rooms.add(roomId, updatedRoom);
        #ok({ slotId; code = roomId });
      };
      case (_) { Runtime.trap("Room not found") };
    };
  };

  // Create a room - no authentication required
  public shared ({ caller }) func createRoom({ hostName; roomId; maxPlayers } : CreateRoomInput) : async CreateRoomResult {
    if (hostName == "") {
      return #invalidHostName({});
    };

    let trimmedName = Text.fromIter(hostName.chars().take(10));
    if (trimmedName.isEmpty()) { return #invalidHostName({}) };

    let maxPlayersValue = if (maxPlayers >= 2 and maxPlayers <= defaultMaxPlayers) {
      maxPlayers;
    } else {
      defaultMaxPlayers;
    };

    let hostPlayer : Player = {
      name = trimmedName;
      slotId = 0;
      principal = caller;
    };
    let players = [hostPlayer];
    let fullPlayers = mapDefaultSlotsToRange(players, maxPlayersValue);
    let uniqueId = generateUniqueRoomId(roomId);
    let room : Room = {
      code = uniqueId;
      players = fullPlayers;
      gameStateJson = "";
      phase = "waiting";
      hostSlotId = 0;
      createdAt = Time.now();
      maxPlayers = maxPlayersValue;
    };
    rooms.add(uniqueId, room);
    #success(uniqueId);
  };

  // Update game state - no authentication required (room code is the access token)
  public shared ({ caller }) func updateGameState(roomId : Text, gameStateJson : Text) : async () {
    switch (rooms.get(roomId)) {
      case (null) {
        Runtime.trap("Room not found");
      };
      case (?room) {
        if (room.phase != "playing") { Runtime.trap("Room is not in playing phase") };

        let updatedRoom : Room = {
          code = room.code;
          players = room.players;
          gameStateJson;
          phase = room.phase;
          hostSlotId = room.hostSlotId;
          createdAt = room.createdAt;
          maxPlayers = room.maxPlayers;
        };
        rooms.add(roomId, updatedRoom);
      };
    };
  };

  // Start game - no authentication required, anyone in the room can start
  public shared ({ caller }) func startGame(roomId : Text) : async () {
    switch (rooms.get(roomId)) {
      case (null) { Runtime.trap("Room not found") };
      case (?room) {
        if (room.phase != "waiting") {
          Runtime.trap("Room is not in waiting phase");
        };

        let filteredPlayers = getAllPlayersCountFiltered(room.players);
        if (filteredPlayers.size() < 2) {
          Runtime.trap("Not enough players (need at least 2)");
        };

        let updatedRoom : Room = {
          code = room.code;
          players = filteredPlayers;
          gameStateJson = room.gameStateJson;
          phase = "playing";
          hostSlotId = room.hostSlotId;
          createdAt = room.createdAt;
          maxPlayers = room.maxPlayers;
        };
        rooms.add(roomId, updatedRoom);
      };
    };
  };

  public query ({ caller }) func getRoom(roomId : Text) : async Room {
    switch (rooms.get(roomId)) {
      case (?room) { room };
      case (_) { Runtime.trap("Room not found") };
    };
  };

  func isRoomExpired(createdAt : Int) : Bool {
    let hours24 : Int = 24 * 60 * 60 * 1_000_000_000;
    (Time.now() - createdAt) > hours24;
  };

  public shared ({ caller }) func cleanupOldRooms() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can cleanup old rooms");
    };

    let entries = rooms.toArray();
    for ((roomId, room) in entries.values()) {
      if (isRoomExpired(room.createdAt)) {
        rooms.remove(roomId);
      };
    };
  };

  public query ({ caller }) func getAllRooms() : async [(Text, Room)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all rooms");
    };
    rooms.toArray();
  };
};

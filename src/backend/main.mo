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
    userProfiles.get(user);
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
    principal : Principal; // Track which principal owns this slot
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
    // Generate random unique code with fallback length increase
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

  func countNonEmptySlots(players : [Player]) : Nat {
    var count = 0;
    for (p in players.values()) {
      if (not p.name.isEmpty()) { count += 1 };
    };
    count;
  };

  func validatePlayerName(name : Text) {
    let filtered = Text.fromIter(
      name.chars().filter(
        func(c) {
          let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
          let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
          isValidChar or isLetter
        }
      )
    );
    if (filtered.size() != name.size() or filtered.size() > 10) {
      Runtime.trap("Invalid name! Please use only valid characters (alphanum only, max length 10 characters)");
    };
  };

  func getFreeSlot(players : [Player], maxPlayers : Nat) : Nat {
    let occupiedSlots = players.map(func(p) { p.slotId });
    for (i in Nat.range(0, maxPlayers - 1)) {
      if (not occupiedSlots.find(func(slot) { slot == i }).isSome()) { return i };
    };
    Runtime.trap("No valid slots left");
  };

  func checkDuplicateName(players : [Player], name : Text) {
    let filteredName = Text.fromIter(
      name.chars().filter(
        func(c) {
          let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
          let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
          isValidChar or isLetter
        }
      )
    );
    let isDuplicate = players.values().any(
      func(p) {
        Text.equal(
          Text.fromIter(
            p.name.chars().filter(
              func(c) {
                let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
                let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
                isValidChar or isLetter;
              }
            )
          ),
          filteredName,
        );
      }
    );
    if (isDuplicate) {
      Runtime.trap("This name already exists");
    };
  };

  func getAllPlayersCountFiltered(players : [Player]) : [Player] {
    players.filter(func(player) { player.name.size() > 0 });
  };

  func isPlayerInRoom(room : Room, caller : Principal) : Bool {
    room.players.values().any(func(p) { p.principal == caller });
  };

  func getPlayerSlotId(room : Room, caller : Principal) : ?Nat {
    for (player in room.players.values()) {
      if (player.principal == caller) {
        return ?player.slotId;
      };
    };
    null;
  };

  public shared ({ caller }) func joinRoom(roomId : Text, playerName : Text) : async JoinRoomResult.Success {
    // Authorization: Only authenticated users can join rooms
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join rooms");
    };

    switch (rooms.get(roomId)) {
      case (?room) {
        if (room.phase == "playing") { Runtime.trap("Game already started!") };
        if (room.players.size() >= defaultMaxPlayers) {
          Runtime.trap("This room is full!");
        };
        let filteredPlayers = getAllPlayersCountFiltered(room.players);

        if (filteredPlayers.size() >= defaultMaxPlayers) {
          Runtime.trap("No more slots left");
        };

        let filteredName = Text.fromIter(
          playerName.chars().filter(
            func(c) {
              let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
              let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
              isValidChar or isLetter
            }
          )
        );
        if (
          filteredPlayers.values().any(
            func(player) {
              Text.equal(
                Text.fromIter(
                  player.name.chars().filter(
                    func(c) {
                      let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
                      let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
                      isValidChar or isLetter;
                    }
                  )
                ),
                filteredName,
              );
            }
          )
        ) {
          Runtime.trap("This name already exists");
        };

        let slotId : Nat = getFreeSlot(filteredPlayers, defaultMaxPlayers);

        let actualName = Text.fromIter(playerName.chars().take(10));

        let newPlayer : Player = {
          name = actualName;
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

  public shared ({ caller }) func createRoom({ hostName; roomId; maxPlayers } : CreateRoomInput) : async CreateRoomResult {
    // Authorization: Only authenticated users can create rooms
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create rooms");
    };

    if (hostName == "" or hostName == "guest") {
      return #invalidHostName({});
    };
    let maxPlayersValue = if (maxPlayers >= 2 and maxPlayers <= defaultMaxPlayers) {
      maxPlayers;
    } else {
      defaultMaxPlayers;
    };

    let filteredHostName = Text.fromIter(
      hostName.chars().filter(
        func(c) {
          let isValidChar = (c >= '0' and c <= '9') or (c >= 'A' and c <= 'Z');
          let isLetter = (c >= 'A' and c <= 'Z') or (c >= 'a' and c <= 'z');
          isValidChar or isLetter
        }
      )
    );
    if (filteredHostName.isEmpty()) { Runtime.trap("Host name cannot be empty") };
    let actualName = Text.fromIter(filteredHostName.chars().take(10));

    let hostPlayer : Player = {
      name = actualName;
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

  public shared ({ caller }) func updateGameState(roomId : Text, gameStateJson : Text) : async () {
    // Authorization: Only authenticated users who are players in the room can update game state
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update game state");
    };

    switch (rooms.get(roomId)) {
      case (null) {
        Runtime.trap("Room not found");
      };
      case (?room) {
        // Verify caller is a player in this room
        if (not isPlayerInRoom(room, caller)) {
          Runtime.trap("Unauthorized: You are not a player in this room");
        };

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

  public shared ({ caller }) func startGame(roomId : Text) : async () {
    // Authorization: Only authenticated users who are the host can start the game
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can start games");
    };

    switch (rooms.get(roomId)) {
      case (null) { Runtime.trap("Room not found") };
      case (?room) {
        // Verify caller is the host
        let hostPlayer = room.players.values().find(func(p) { p.slotId == room.hostSlotId });
        switch (hostPlayer) {
          case (?host) {
            if (host.principal != caller) {
              Runtime.trap("Unauthorized: Only the host can start the game");
            };
          };
          case (_) { Runtime.trap("Host not found in room") };
        };

        if (room.phase != "waiting") {
          Runtime.trap("Room is not in waiting phase");
        };

        let filteredPlayers = getAllPlayersCountFiltered(room.players);
        if (filteredPlayers.size() < 2) {
          Runtime.trap("Not enough players");
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
    // Authorization: Anyone can view room data (including guests)
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
    // Authorization: Admin-only function
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
    // Authorization: Admin-only function (exposes all room data)
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all rooms");
    };
    rooms.toArray();
  };
};

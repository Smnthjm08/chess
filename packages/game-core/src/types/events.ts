// server & client event types
export enum EventType {
  CONNECTED = "connected",
  GAME_JOIN = "game:join",
  GAME_LEAVE = "game:leave",
  GAME_STATE = "game:state",
  GAME_MOVE = "game:move",
  GAME_PAUSE = "game:pause",
  GAME_RESUME = "game:resume",
  GAME_RESIGN = "game:resign",
  GAME_DRAW_OFFER = "game:draw:offer",
  GAME_DRAW_ACCEPT = "game:draw:accept",
  GAME_DRAW_DECLINE = "game:draw:decline",
  GAME_REMATCH_OFFER = "game:rematch:offer",
  GAME_REMATCH_ACCEPT = "game:rematch:accept",
  GAME_REMATCH_DECLINE = "game:rematch:decline",
  GAME_REMATCH_READY = "game:rematch:ready",
  GAME_ERROR = "game:error",
}

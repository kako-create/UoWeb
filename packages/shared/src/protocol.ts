export type EntityId = string;
export type Vec2 = { x: number; y: number };

export type ClientMsg =
  | { t: "hello"; v: number; name?: string }
  | { t: "input"; seq: number; cmds: Command[] };

export type ServerMsg =
  | { t: "welcome"; selfId: EntityId; tickRate: number; snapRate: number }
  | { t: "state"; stime: number; ackSeq: number; ents: EntityState[] };

export type Command =
  | { k: "moveTo"; x: number; y: number }
  | { k: "stop" };

export type EntityState = {
  id: EntityId;
  p: Vec2;
  v: Vec2;
  a: "idle" | "walk";
};

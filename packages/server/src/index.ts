import { WebSocketServer } from "ws";
import type {
  ClientMsg,
  ServerMsg,
  EntityId,
  EntityState,
  Command,
} from "@game/shared";

type Client = {
  ws: import("ws").WebSocket;
  id: EntityId;
  lastSeq: number;
  queue: { seq: number; cmds: Command[] }[];
};

const wss = new WebSocketServer({ port: 8086 });

const clients = new Map<EntityId, Client>();
const ents = new Map<EntityId, EntityState>();

const TICK_RATE = 20; // 50ms
const SNAP_RATE = 10; // 100ms
const DT = 1 / TICK_RATE;

function uid(): EntityId {
  return Math.random().toString(36).slice(2, 10);
}

function send(ws: any, msg: ServerMsg) {
  ws.send(JSON.stringify(msg));
}

function applyCmd(e: EntityState, cmd: Command) {
  if (cmd.k === "moveTo") {
    const dx = cmd.x - e.p.x;
    const dy = cmd.y - e.p.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 140;
    e.v.x = (dx / len) * speed;
    e.v.y = (dy / len) * speed;
    e.a = "walk";
  } else if (cmd.k === "stop") {
    e.v.x = 0;
    e.v.y = 0;
    e.a = "idle";
  }
}

wss.on("connection", (ws) => {
  const id = uid();
  const c: Client = { ws, id, lastSeq: 0, queue: [] };
  clients.set(id, c);

  ents.set(id, { id, p: { x: 300, y: 220 }, v: { x: 0, y: 0 }, a: "idle" });

  send(ws, { t: "welcome", selfId: id, tickRate: TICK_RATE, snapRate: SNAP_RATE });

  ws.on("message", (buf) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }

    if (msg.t === "hello") return;

    if (msg.t === "input") {
      c.queue.push({ seq: msg.seq, cmds: msg.cmds });
    }
  });

  ws.on("close", () => {
    clients.delete(id);
    ents.delete(id);
  });
});

let tickCount = 0;

setInterval(() => {
  for (const c of clients.values()) {
    const e = ents.get(c.id);
    if (!e) continue;

    while (c.queue.length) {
      const pack = c.queue.shift()!;
      c.lastSeq = Math.max(c.lastSeq, pack.seq);
      for (const cmd of pack.cmds) applyCmd(e, cmd);
    }

    e.p.x += e.v.x * DT;
    e.p.y += e.v.y * DT;
  }

  tickCount++;
  if (tickCount % Math.floor(TICK_RATE / SNAP_RATE) === 0) {
    const arr = [...ents.values()];
    for (const c of clients.values()) {
      send(c.ws, { t: "state", stime: Date.now(), ackSeq: c.lastSeq, ents: arr });
    }
  }
}, 1000 / TICK_RATE);

console.log("WS on ws://0.0.0.0:8086");

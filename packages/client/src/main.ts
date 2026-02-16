import * as PIXI from "pixi.js";
import type { ClientMsg, ServerMsg, EntityState } from "@game/shared";

const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? "ws://localhost:8086";

const app = new PIXI.Application();
await app.init({ resizeTo: window, backgroundAlpha: 1 });

document.body.style.margin = "0";
document.body.appendChild(app.canvas);

const label = new PIXI.Text({ text: "connecting...", style: { fill: "#ffffff" } });
label.x = 12;
label.y = 10;
app.stage.addChild(label);

const dots = new Map<string, PIXI.Graphics>();
let seq = 0;

function upsert(ent: EntityState) {
  let g = dots.get(ent.id);
  if (!g) {
    g = new PIXI.Graphics();
    g.circle(0, 0, 10).fill(0xffffff);
    app.stage.addChild(g);
    dots.set(ent.id, g);
  }
  g.x = ent.p.x;
  g.y = ent.p.y;
}

const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  const hello: ClientMsg = { t: "hello", v: 1 };
  ws.send(JSON.stringify(hello));
  label.text = "connected";
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data) as ServerMsg;

  if (msg.t === "welcome") {
    label.text = `connected | self=${msg.selfId}`;
    return;
  }

  if (msg.t === "state") {
    for (const e of msg.ents) upsert(e);
  }
};

ws.onclose = () => {
  label.text = "disconnected";
};

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;
app.stage.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
  if (ws.readyState !== WebSocket.OPEN) return;

  const p = e.global;
  const m: ClientMsg = {
    t: "input",
    seq: ++seq,
    cmds: [{ k: "moveTo", x: p.x, y: p.y }],
  };
  ws.send(JSON.stringify(m));
});

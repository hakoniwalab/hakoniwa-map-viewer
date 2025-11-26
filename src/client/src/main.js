import { PduManager, WebSocketCommunicationService } from './index.js';
const CONFIG = {
  pdu_def_path: "/config/pdudef.json",
  ws_uri: "ws://127.0.0.1:54001",
  wire_version: "v1"
};

console.log("[HakoniwaViewer] main.js loaded");

// マップ初期化
const map = L.map('map').setView([35.6812, 139.7671], 15); // 東京駅

// OSMタイル
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

console.log("[HakoniwaViewer] Map initialized");

// PDUマネージャ初期化
const websocketCommunicationService = new WebSocketCommunicationService(CONFIG.wire_version);
const pduManager = new PduManager({ wire_version: CONFIG.wire_version });
await pduManager.initialize(CONFIG.pdu_def_path, websocketCommunicationService);
console.log("[HakoniwaViewer] PduManager initialized");

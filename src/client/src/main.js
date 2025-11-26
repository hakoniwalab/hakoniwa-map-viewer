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


// PDUマネージャ初期化関数
async function initializePduManager() {
    // PDUマネージャ初期化
    const websocketCommunicationService = new WebSocketCommunicationService(CONFIG.ws_uri, CONFIG.wire_version);
    const pduManager = new PduManager({ wire_version: CONFIG.wire_version });
    await pduManager.initialize(CONFIG.pdu_def_path, websocketCommunicationService);
    console.log("[HakoniwaViewer] PduManager initialized");
    return pduManager;
}

document.addEventListener('DOMContentLoaded', (event) => {
    const connectBtn = document.getElementById('connect-btn');
    let isConnected = false;
    let pduManager = null;

    connectBtn.addEventListener('click', async () => {
        if (!isConnected) {
            try {
                pduManager = await initializePduManager();
                if (pduManager) {
                    console.log("[HakoniwaViewer] Connected.");
                    connectBtn.textContent = 'disconnect';
                    isConnected = true;
                }
            } catch (error) {
                console.error("[HakoniwaViewer] Connection failed:", error);
            }
        } else {
            if (pduManager && pduManager.getCommunicationService()) {
                //TODO pduManager.getCommunicationService().close();
                console.log("[HakoniwaViewer] Disconnected.");
            }
            pduManager = null;
            connectBtn.textContent = 'connect';
            isConnected = false;
        }
    });
});

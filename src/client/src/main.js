import { Hakoniwa } from './hakoniwa/hakoniwa-pdu.js';

console.log("[HakoniwaViewer] main.js loaded");

// マップ初期化
const map = L.map('map').setView([35.6812, 139.7671], 15); // 東京駅

// OSMタイル
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

console.log("[HakoniwaViewer] Map initialized");

document.addEventListener('DOMContentLoaded', (event) => {
    const connectBtn = document.getElementById('connect-btn');
    let isConnected = false;
    let pduManager = null;

    connectBtn.addEventListener('click', async () => {
        const state = Hakoniwa.getConnectionState();
        if (!state.isConnected) {
            const ok = await Hakoniwa.connect();
            if (ok) {
                Hakoniwa.withPdu(async (pdu) => {
                    const ret = await pdu.declare_pdu_for_read('Drone', 'pos');
                    console.log("[HakoniwaViewer] PDU Data:", ret);
                });
                isConnected = true;
                connectBtn.textContent = 'connected';
                startPduPolling();
            }
            else {
                connectBtn.textContent = 'disconnected';
            }
        } else {
            await Hakoniwa.disconnect();
            connectBtn.textContent = 'disconnected';
        }        
    });

    function startPduPolling() {
        setInterval(() => {
            Hakoniwa.withPdu((pdu) => {
                const buf = pdu.read_pdu_raw_data('Drone', 'pos');
                if (buf) {
                    console.log("[HakoniwaViewer] raw len:", buf.byteLength);
                } else {
                    console.log("[HakoniwaViewer] raw len: 0 (no buffer)");
                }
            });
        }, 100);
    }    
});

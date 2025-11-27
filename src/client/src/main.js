import { Hakoniwa } from './hakoniwa/hakoniwa-pdu.js';
import { Twist } from '/thirdparty/hakoniwa-pdu-javascript/src/pdu_msgs/geometry_msgs/pdu_jstype_Twist.js';
import { pduToJs_Twist } from '/thirdparty/hakoniwa-pdu-javascript/src/pdu_msgs/geometry_msgs/pdu_conv_Twist.js';
import { HakoniwaFrame } from './hakoniwa/frame.js';

console.log("[HakoniwaViewer] main.js loaded");

// マップ初期化
const map = L.map('map').setView([35.6812, 139.7671], 15); // 東京駅

let droneMarker = null;
let droneTrail = [];
let droneTrailPolyline = null;

const ORIGIN_LAT = 35.6812;   // zone の原点（仮）
const ORIGIN_LON = 139.7671;
const TRAIL_KEEP_MS = 10_000; // 10秒だけ残す
let followMode = true;        // 自動スクロールON/OFF
const droneIcon = L.icon({
  iconUrl: '/images/drone.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
function updateDroneMarker(lat, lon, yawRad) {
  const latlng = [lat, lon];

  if (!droneMarker) {
    // 最初だけ作成
    droneMarker = L.marker(latlng, {
      icon: droneIcon,
      // rotatedMarker 使うなら:
      // rotationAngle: HakoniwaFrame.rad2deg(yawRad),
      // rotationOrigin: 'center center'
    }).addTo(map);
  } else {
    droneMarker.setLatLng(latlng);
    // rotatedMarker 使うなら:
    droneMarker.setRotationAngle(HakoniwaFrame.rad2deg(-yawRad));
  }

  if (followMode) {
    // 画面外に出たときだけ追従したいなら contains チェックしてから
    if (!map.getBounds().contains(latlng)) {
      map.panTo(latlng);
    }
    // つねに中心にしたいなら単に:
    // map.setView(latlng);
  }
}
function updateDroneTrail(lat, lon) {
  const now = Date.now();
  droneTrail.push({ lat, lon, t: now });

  // 古い点を削除
  const cutoff = now - TRAIL_KEEP_MS;
  droneTrail = droneTrail.filter(p => p.t >= cutoff);

  const latlngs = droneTrail.map(p => [p.lat, p.lon]);

  if (!droneTrailPolyline) {
    droneTrailPolyline = L.polyline(latlngs, { weight: 2 }).addTo(map);
  } else {
    droneTrailPolyline.setLatLngs(latlngs);
  }
}

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
                    const twist = pduToJs_Twist(buf);
                    console.log("[HakoniwaViewer] Twist:", twist);
                    const x_ros = twist.linear.x;
                    const y_ros = twist.linear.y;
                    const z_ros = twist.linear.z;
                    const yaw    = twist.angular.z;
                    // ROS → ENU
                    const [enu_x, enu_y, enu_z] = HakoniwaFrame.rosToEnuFrame(x_ros, y_ros, z_ros);
                    // ENU → 緯度経度
                    const [lat, lon] = HakoniwaFrame.ENUToLatLon(ORIGIN_LAT, ORIGIN_LON, enu_x, enu_y);

                    updateDroneMarker(lat, lon, yaw);
                    updateDroneTrail(lat, lon);
                } else {
                    console.log("[HakoniwaViewer] raw len: 0 (no buffer)");
                }
            });
        }, 100);
    }    
});
const followCheckbox = document.getElementById('follow-checkbox');
if (followCheckbox) {
    followCheckbox.addEventListener('change', () => {
        followMode = followCheckbox.checked;
    });
}

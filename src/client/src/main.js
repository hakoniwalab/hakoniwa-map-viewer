import { Hakoniwa } from './hakoniwa/hakoniwa-pdu.js';
import { pduToJs_Twist } from '/thirdparty/hakoniwa-threejs-drone/thirdparty/hakoniwa-pdu-javascript/src/pdu_msgs/geometry_msgs/pdu_conv_Twist.js';
import { HakoniwaFrame } from './hakoniwa/frame.js';

console.log("[HakoniwaViewer] main.js loaded");
// ===== 複数機体の設定 =====
const DRONE_CONFIGS = [
  // 今は 1 機だけだけど、ここに増やしていけばそのまま対応可能
  { id: 'Drone', label: 'Drone #1', color: 'red' },
  // { id: 'Drone2', label: 'Drone #2', color: 'blue' }, みたいに足せる
];

let currentDroneId = DRONE_CONFIGS[0].id;

// 機体ごとの状態
const drones = new Map(); // id -> { marker, trail, trailPolyline, lastState }

function getOrCreateDroneState(id) {
  let st = drones.get(id);
  if (!st) {
    st = {
      marker: null,
      trail: [],
      trailPolyline: null,
      lastState: null, // { x_ros, y_ros, z_ros, roll, pitch, yaw }
    };
    drones.set(id, st);
  }
  return st;
}
// プロパティ表示用 DOM
const propElems = {
  x:        document.getElementById('prop-x'),
  y:        document.getElementById('prop-y'),
  z:        document.getElementById('prop-z'),
  rollDeg:  document.getElementById('prop-roll'),
  pitchDeg: document.getElementById('prop-pitch'),
  yawDeg:   document.getElementById('prop-yaw'),
};

function setText(elem, value) {
  if (elem) elem.textContent = value;
}

// 選択中の機体の状態だけ表示
function updateDroneProperties(droneId, x_ros, y_ros, z_ros, roll, pitch, yaw) {
  if (droneId !== currentDroneId) return;

  setText(propElems.x, x_ros.toFixed(3));
  setText(propElems.y, y_ros.toFixed(3));
  setText(propElems.z, z_ros.toFixed(3));

  const rollDeg  = HakoniwaFrame.rad2deg(roll);
  const pitchDeg = HakoniwaFrame.rad2deg(pitch);
  const yawDeg   = HakoniwaFrame.rad2deg(yaw);

  setText(propElems.rollDeg,  rollDeg.toFixed(1));
  setText(propElems.pitchDeg, pitchDeg.toFixed(1));
  setText(propElems.yawDeg,   yawDeg.toFixed(1));
}
// マップ初期化
const map = L.map('map').setView([35.6812, 139.7671], 15); // 東京駅


let ORIGIN_LAT = 35.6625;   // zone の原点（仮）
let ORIGIN_LON = 139.70625;
const TRAIL_KEEP_MS = 100_000; // 100秒だけ残す
let followMode = true;        // 自動スクロールON/OFF
const droneIcon = L.icon({
  iconUrl: '/images/drone.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
function updateDroneMarker(droneId, lat, lon, yawRad) {
  const st = getOrCreateDroneState(droneId);
  const latlng = [lat, lon];

  if (!st.marker) {
    // 最初だけ作成
    st.marker = L.marker(latlng, {
      icon: droneIcon,
      // rotatedMarker 使うなら:
      // rotationAngle: HakoniwaFrame.rad2deg(yawRad),
      // rotationOrigin: 'center center'
    }).addTo(map);
  } else {
    st.marker.setLatLng(latlng);
    // rotatedMarker 使うなら:
    st.marker.setRotationAngle(HakoniwaFrame.rad2deg(-yawRad));
  }

  if (followMode) {
    // 画面外に出たときだけ追従したいなら contains チェックしてから
    if (followMode && droneId === currentDroneId) {
      map.panTo(latlng);
    }
    // つねに中心にしたいなら単に:
    // map.setView(latlng);
  }
}
function updateDroneTrail(droneId, lat, lon) {
  const st = getOrCreateDroneState(droneId);
  const now = Date.now();
  st.trail.push({ lat, lon, t: now });

  // デバッグ用ログ
  // console.log("trail push:", lat.toFixed(7), lon.toFixed(7));

  // 古い点を削除
  const cutoff = now - TRAIL_KEEP_MS;
  st.trail = st.trail.filter(p => p.t >= cutoff);

  // 2点未満なら線は見えないのでここで終わり
  if (st.trail.length < 2) {
    return;
  }

  const latlngs = st.trail.map(p => [p.lat, p.lon]);
  if (!st.trailPolyline) {
    const cfg = DRONE_CONFIGS.find(c => c.id === droneId);
    const color = cfg?.color ?? 'red';
    st.trailPolyline = L.polyline(latlngs, {
      color: color,      // はっきりした色に
      weight: 5,         // 少し太め
      opacity: 0.9
    }).addTo(map);
  } else {
    st.trailPolyline.setLatLngs(latlngs);
  }
}


// OSMタイル
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

console.log("[HakoniwaViewer] Map initialized");

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connect-btn');
  const droneSelect = document.getElementById('drone-select');
  const followCheckbox = document.getElementById('follow-checkbox');
  const latInput = document.getElementById('origin-lat');
  const lonInput = document.getElementById('origin-lon');
  const applyOriginBtn = document.getElementById('apply-origin-btn');

  latInput.value = ORIGIN_LAT;
  lonInput.value = ORIGIN_LON;
  // 機体セレクトの初期化
  if (droneSelect) {
    DRONE_CONFIGS.forEach(cfg => {
      const opt = document.createElement('option');
      opt.value = cfg.id;
      opt.textContent = cfg.label;
      droneSelect.appendChild(opt);
    });
    droneSelect.value = currentDroneId;
    droneSelect.addEventListener('change', () => {
      currentDroneId = droneSelect.value;
      // ここで、選択変更直後に lastState からプロパティ再表示してもOK
    });
  }

  if (followCheckbox) {
    followCheckbox.addEventListener('change', () => {
      followMode = followCheckbox.checked;
    });
  }

  connectBtn.addEventListener('click', async () => {
    const state = Hakoniwa.getConnectionState();
    if (!state.isConnected) {
      const ok = await Hakoniwa.connect();
      if (ok) {
        Hakoniwa.withPdu(async (pdu) => {
          for (const cfg of DRONE_CONFIGS) {
            const ret = await pdu.declare_pdu_for_read(cfg.id, 'pos');
            console.log(`[HakoniwaViewer] declare ${cfg.id}/pos:`, ret);
          }
        });
        connectBtn.textContent = 'connected';
        startPduPolling();
      } else {
        connectBtn.textContent = 'disconnected';
      }
    } else {
      await Hakoniwa.disconnect();
      connectBtn.textContent = 'disconnected';
    }
  });
  if (applyOriginBtn) {
    applyOriginBtn.addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);

      if (isNaN(lat) || isNaN(lon)) {
        alert("緯度・経度の入力が正しくありません");
        return;
      }

      ORIGIN_LAT = lat;
      ORIGIN_LON = lon;

      console.log("[HakoniwaViewer] New ORIGIN:", ORIGIN_LAT, ORIGIN_LON);

      // マップの中心を変更
      map.panTo([ORIGIN_LAT, ORIGIN_LON]);
    });
  }
  function startPduPolling() {
    setInterval(() => {
      Hakoniwa.withPdu((pdu) => {
        for (const cfg of DRONE_CONFIGS) {
          const id = cfg.id;
          const buf = pdu.read_pdu_raw_data(id, 'pos');
          if (!buf) continue;

          const twist = pduToJs_Twist(buf);

          const x_ros = twist.linear.x;
          const y_ros = twist.linear.y;
          const z_ros = twist.linear.z;
          const roll  = twist.angular.x;
          const pitch = twist.angular.y;
          const yaw   = twist.angular.z;

          // プロパティ更新（選択中機体だけ実際に表示される）
          updateDroneProperties(id, x_ros, y_ros, z_ros, roll, pitch, yaw);

          const [enu_x, enu_y, enu_z] = HakoniwaFrame.rosToEnuFrame(x_ros, y_ros, z_ros);
          const [lat, lon] = HakoniwaFrame.ENUToLatLon(ORIGIN_LAT, ORIGIN_LON, enu_x, enu_y);

          updateDroneMarker(id, lat, lon, yaw);
          updateDroneTrail(id, lat, lon);
        }
      });
    }, 100);
  }
});


import { Hakoniwa } from '/thirdparty/hakoniwa-threejs-drone/src/hakoniwa/hakoniwa-pdu.js';
import { getDrones } from "/thirdparty/hakoniwa-threejs-drone/src/app.js";
import { HakoniwaFrame } from './frame.js';

console.log("[HakoniwaViewer] main.js loaded");
const drones = new Map();
let currentDroneId = null;

// マップ初期化
const map = L.map('map').setView([35.6812, 139.7671], 15); // 東京駅
let ORIGIN_LAT = 35.6625;   // zone の原点（仮）
let ORIGIN_LON = 139.70625;
const TRAIL_KEEP_MS = 10000_000; // 10000秒だけ残す
let followMode = true;        // 自動スクロールON/OFF
const droneIcon = L.icon({
  iconUrl: '/images/drone.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// OSMタイル
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

console.log("[HakoniwaViewer] Map initialized");

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
function updateDroneProperties(droneId, x_ros, y_ros, z_ros, rollDeg, pitchDeg, yawDeg) {
  if (String(droneId) !== String(currentDroneId)) return;

  setText(propElems.x, x_ros.toFixed(3));
  setText(propElems.y, y_ros.toFixed(3));
  setText(propElems.z, z_ros.toFixed(3));


  setText(propElems.rollDeg,  rollDeg.toFixed(1));
  setText(propElems.pitchDeg, pitchDeg.toFixed(1));
  setText(propElems.yawDeg,   yawDeg.toFixed(1));
}

function updateDroneMarker(droneId, lat, lon, yawDeg) {
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
    st.marker.setRotationAngle(-yawDeg);
  }

  if (followMode && String(droneId) === String(currentDroneId)) {
    map.panTo(latlng);
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
    const color = 'red';
    st.trailPolyline = L.polyline(latlngs, {
      color: color,      // はっきりした色に
      weight: 5,         // 少し太め
      opacity: 0.9
    }).addTo(map);
  } else {
    st.trailPolyline.setLatLngs(latlngs);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connect-btn');
  const droneSelect = document.getElementById("drone-select");
  const followCheckbox = document.getElementById('follow-checkbox');
  const latInput = document.getElementById('origin-lat');
  const lonInput = document.getElementById('origin-lon');
  const applyOriginBtn = document.getElementById('apply-origin-btn');

  latInput.value = ORIGIN_LAT;
  lonInput.value = ORIGIN_LON;

  function populateDroneSelect() {
    const ds = getDrones();
    droneSelect.innerHTML = "";

    ds.forEach((drone, index) => {
      const opt = document.createElement("option");
      opt.value = drone.droneId ?? index;
      opt.textContent = drone.name ?? `${drone.droneId}`;
      droneSelect.appendChild(opt);
    });

    if (ds.length > 0) {
      currentDroneId = String(ds[0].droneId ?? 0);
      droneSelect.value = currentDroneId;
    }
  }
  droneSelect.addEventListener("change", () => {
    currentDroneId = droneSelect.value;
  });
  // --- 選択中ドローンを取得 ---
  function getSelectedDrone() {
    const drones = getDrones();
    if (!drones.length) return null;

    const selId = droneSelect.value;
    if (!selId) return drones[0];

    const found = drones.find(d => String(d.droneId) === selId);
    return found || drones[0];
  }

  if (!connectBtn) {
    console.warn("connect-btn not found");
    return;
  }

  connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;
    connectBtn.textContent = "connecting...";
    const wsUriInput = document.getElementById('ws-uri-input');

    try {
      const wsUri = (wsUriInput?.value || "").trim() || "ws://127.0.0.1:8765";
      Hakoniwa.configure({
        pdu_def_path: "/config/pdudef.json",   // 必要なら変更
        ws_uri: wsUri,              // 別ホストにもできる
        wire_version: "v1",
      });
      const ok = await Hakoniwa.connect();
      if (ok) {
        let drones = getDrones();
        for (let i = 0; i < drones.length; i++) {
          const drone = drones[i];
          drone.initPdu();  // Drone ごとに PDU 初期化＋ポーリング開始
        }

        populateDroneSelect();
        connectBtn.textContent = "connected";
        startPduPolling();
      } else {
        connectBtn.textContent = "connect failed";
        connectBtn.disabled = false;
      }
    } catch (e) {
      console.error(e);
      connectBtn.textContent = "error";
      connectBtn.disabled = false;
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
  followCheckbox.addEventListener('change', () => {
    followMode = followCheckbox.checked;
  });

  function startPduPolling() {
    setInterval(() => {
      const drones = getDrones();
      drones.forEach(drone => {
        if (!drone.latestPose) return;
        const [rosX, rosY, rosZ] = drone.latestPose.rosPos;
        const [ rollDeg, pitchDeg, yawDeg ] = drone.latestPose.rosRpyDeg;
        updateDroneProperties(drone.droneId, rosX, rosY, rosZ, rollDeg, pitchDeg, yawDeg);

        const [enu_x, enu_y, enu_z] = HakoniwaFrame.rosToEnuFrame(rosX, rosY, rosZ);
        const [lat, lon] = HakoniwaFrame.ENUToLatLon(ORIGIN_LAT, ORIGIN_LON, enu_x, enu_y);

        updateDroneMarker(drone.droneId, lat, lon, yawDeg);
        updateDroneTrail(drone.droneId, lat, lon);

      });
    },  100);
  }
});

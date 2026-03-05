# Combined Test (legacy + fleets)

## 目的

`map-viewer` と `threejs(thirdparty)` と `web bridge` の結合で、  
legacy / fleets の位置・姿勢更新が正しく可視化されることを確認する。

## 前提

- `hakoniwa-drone-pro` がビルド済み
- `work/hakoniwa-pdu-bridge-core` がビルド済み
- `work/hakoniwa-map-viewer/thirdparty/hakoniwa-threejs-drone` が配置済み
- `hakoniwa-threejs-drone` の入れ子 submodule が初期化済み
  - `work/hakoniwa-map-viewer` で以下を実行
```bash
git submodule update --init --recursive
```

## A. legacy 手順

1. `hakoniwa-drone-pro` で drone service 起動
```bash
./mac/mac-main_hako_drone_service config/drone/fleets/api-1.json config/pdudef/drone-pdudef-1.json
```

2. `work/hakoniwa-pdu-bridge-core` で legacy bridge 起動
```bash
./tools/run-web-bridge.bash \
  --config-root config/web_bridge \
  --asset-name WebBridge \
  --node-name web_bridge_node1 \
  --delta-time-step-usec 20000 \
  --enable-ondemand
```

3. `work/hakoniwa-map-viewer` で配信起動
```bash
python -m http.server 8001
```

4. ブラウザで legacy URL を開く
```text
http://localhost:8001/src/client/index.html?viewerConfigName=viewer-config-legacy-base.json
```

5. 画面で `connect` を押す

## B. fleets 手順

1. `hakoniwa-drone-pro` で drone service 起動
```bash
./mac/mac-main_hako_drone_service config/drone/fleets/api-1.json config/pdudef/drone-pdudef-1.json
```

2. `hakoniwa-drone-pro` で visual_state_publisher 起動
```bash
./src/cmake-build/assets/visual_state_publisher/drone_visual_state_publisher config/assets/visual_state_publisher/visual_state_publisher.json
```

3. `work/hakoniwa-pdu-bridge-core` で fleets bridge 起動
```bash
./tools/run-web-bridge.bash \
  --config-root config/web_bridge_fleets \
  --node-name web_bridge_fleets_node1 \
  --delta-time-step-usec 20000 \
  --enable-ondemand
```

4. `work/hakoniwa-map-viewer` で配信起動
```bash
python -m http.server 8001
```

5. ブラウザで fleets URL を開く
```text
http://localhost:8001/src/client/index.html?viewerConfigName=viewer-config-fleets.json
```

6. 画面で `connect` を押す

## 期待結果

- legacy / fleets の両方で map + 3D の機体位置/姿勢が更新される
- Drone 選択で追従が切り替わる
- ブラウザコンソールに致命エラーが出ない

## 失敗時の取得ログ

- map-viewer のブラウザコンソール
- `work/hakoniwa-pdu-bridge-core/logs/web-bridge-latest.log`
- visual_state_publisher のエラー出力

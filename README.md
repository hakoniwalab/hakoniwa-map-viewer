# 箱庭ドローン Map Viewer

箱庭ドローンの状態を、Leafletの地図表示とThree.jsの3D表示で同時に監視するブラウザビューアです。

本リポジトリは、ドローン物理やWebSocketブリッジを実行するランタイムではありません。互換性のあるWebSocket状態配信を受け取り、地図・飛行軌跡・位置姿勢・3Dシーンを一つの画面へ統合します。

## 現在のアーキテクチャ

```text
Hakoniwa Drone / state publisher
              |
              v
      shared-memory PDU
              |
              v
hakoniwa-pdu-bridge-core WebBridge
              |
              v
          WebSocket
              |
              v
      hakoniwa-map-viewer
        |             |
        v             v
   Leaflet map   hakoniwa-threejs-drone
```

`hakoniwa-threejs-drone`は`thirdparty/hakoniwa-threejs-drone`のsubmoduleとして利用します。map-viewerは、その公開APIである`createDroneViewer()`を呼び出し、地図UIと3Dビューを統合します。

## 責任範囲

map-viewerが担当するもの:

- Leaflet地図とThree.jsシーンの統合表示
- ドローンの選択、追従、位置姿勢、飛行軌跡の表示
- ROS座標からENU、緯度経度への表示用変換
- `threejsRoot`および`viewerConfigName`によるThree.js設定の選択
- PLATEAU渋谷GLBの配布場所と利用案内

map-viewerが担当しないもの:

- ドローンの物理計算、飛行制御、センサ計算
- `DroneVisualStateArray`などの状態生成
- shared-memory PDUからWebSocketへの変換
- 風、GPS強度、温度などの環境モデル生成
- シミュレーション全体のLauncherとライフサイクル管理

これらは、`hakoniwa-drone-core`、`hakoniwa-pdu-bridge-core`、`hakoniwa-envsim`、またはHakoniwa Business PackのRecipeが担当します。

## セットアップ

submoduleを含めてクローンします。

```bash
git clone --recursive https://github.com/hakoniwalab/hakoniwa-map-viewer.git
cd hakoniwa-map-viewer
```

既にクローン済みの場合は、submoduleを再帰的に初期化してください。

```bash
git submodule update --init --recursive
```

## component-owned validation

map-viewerは、静的Webコンポーネントとして意味のある3つの標準操作を`tools/hako.py`で提供します。

```bash
python tools/hako.py doctor
python tools/hako.py test
python tools/hako.py smoke
```

- `doctor`: Python、map-viewer必須ファイル、再帰submodule、内包Three.js Viewerの準備状態を確認します。
- `test`: 地図・座標変換・Three.js公開API・READMEの静的契約を検証し、内包Three.js Viewerのテストも実行します。
- `smoke`: 一時HTTPサーバーを起動し、地図UI、座標変換、Three.js Viewer、PDU JavaScriptまで実際に取得します。

このリポジトリにはネイティブな生成物がないため、`configure`、`build`、`install`は提供しません。

`smoke`は静的配信構造を検証します。実際のWebSocket状態更新とブラウザ描画は、互換性のあるE2Eランタイムで確認してください。

## 起動

まず、WebBridgeを含む互換性のあるHakoniwaランタイムを起動します。現在の基準構成はHakoniwa Business Packの次のRecipeです。

```text
drone-single-mujoco-threejs-gamepad
```

このRecipeは、Drone service、DroneVisualStatePublisher、shared-memory PDU、WebBridge、WebSocket、Three.js Viewerの経路を一つのLauncherで構成します。map-viewerは同じWebSocket経路へ接続する上位表示として利用できます。

次に、map-viewerのリポジトリルートをHTTP配信します。

```bash
python -m http.server 8001
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8001/src/client/index.html
```

画面内のWebSocket URIを確認し、`connect`を押してください。既定値は`ws://127.0.0.1:8765`です。

## Three.js設定の切替

map-viewerは、URLクエリでThree.js実装とViewer設定を切り替えられます。

既定のsubmoduleを使用:

```text
http://127.0.0.1:8001/src/client/index.html
```

fleets設定を使用:

```text
http://127.0.0.1:8001/src/client/index.html?viewerConfigName=viewer-config-fleets.json
```

別の配信パスにあるThree.js実装を使用:

```text
http://127.0.0.1:8001/src/client/index.html?threejsRoot=/work/hakoniwa-threejs-drone&viewerConfigName=viewer-config-fleets.json
```

`threejsRoot`は、ブラウザから同じHTTP配信ルート上で取得できるパスである必要があります。

## PLATEAU渋谷GLB

渋谷エリアのPLATEAU派生GLBは、map-viewerのRelease Assetとして配布する方針です。

- Release: https://github.com/hakoniwalab/hakoniwa-map-viewer/releases
- Asset: `13113_shibuya-ku_pref_2023_citygml_2_op.glb`
- 従来の配置先: `assets/models/`

このGLBは標準起動には不要です。既定のbase Viewerは、GLBがなくても`doctor`、`test`、`smoke`を実行できます。

PLATEAU都市表示を行うRecipeでは、GLB、対応するscene config、原点、座標軸、スケール、出典、checksumを一つのAsset Contractとして明示する必要があります。Releaseへ正式登録する際は、PLATEAUの出典表示と加工内容を記録したファイルをAssetと一緒に提供します。

## 座標変換

地図表示では、ドローン状態のROS座標を次の順で変換します。

```text
ROS frame -> ENU -> latitude / longitude
```

`src/client/src/frame.js`が次を担当します。

- ROS / ENU変換
- EPSG:6677を用いた平面直角座標変換
- 指定原点からの緯度経度算出

既定の表示原点は渋谷エリアの`35.6625, 139.70625`です。画面から変更できます。

## UI

- `connect`: WebSocketへ接続
- WebSocket URI: 接続先を指定
- Viewer Config: 使用中のThree.js設定を表示
- Drone: 注視対象を選択
- Follow selected: 選択機体を地図と3Dカメラで追従
- Origin: 表示用の緯度経度原点を変更
- Drone State: ROS位置とRPY姿勢を表示

## 技術スタック

- Three.js: ドローンと3Dシーンの描画
- Leaflet: OpenStreetMap上の位置と飛行軌跡の表示
- proj4: ROS / ENU座標と緯度経度の変換
- Hakoniwa PDU JavaScript: WebSocket経由のPDU受信

## 関連コンポーネント

- `hakoniwa-threejs-drone`: 3D描画とViewer公開API
- `hakoniwa-pdu-bridge-core`: shared-memory PDUとWebSocketの橋渡し
- `hakoniwa-drone-core`: ドローン物理と状態生成
- `hakoniwa-envsim`: 環境モデルとPLATEAU関連データ
- `hakoniwa-business-pack`: Foundation、Recipe workspace、Launcher、検証記録

## 検証範囲

GitHub Actionsでは、再帰submoduleを取得した上で次を実行します。

```bash
python tools/hako.py doctor
python tools/hako.py test
python tools/hako.py smoke
```

ブラウザでの実描画、WebSocket接続、ドローン位置更新、PLATEAU GLBとMuJoCoの座標一致はE2E Recipeの検証対象です。

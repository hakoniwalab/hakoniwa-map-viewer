# 箱庭ドローン Map Viewer

箱庭ドローンシミュレータと連携し、  
**PLATEAU都市データ上でのドローン飛行を、地図および3Dビューでリアルタイムに可視化する** ブラウザビューアです。

## 想定ユーザー

* 箱庭ドローンのリアルタイム監視用ブラウザの利用者

## 前提条件

[箱庭ドローンシミュレータ](https://github.com/toppers/hakoniwa-drone-core)の[コンテナパターン](https://github.com/toppers/hakoniwa-drone-core/blob/main/docs/getting_started/container.md)のアーキテクチャを前提とします。

## リポジトリのクローン

以下のリポジトリを、同一ディレクトリ直下でクローンします。

※ これらのリポジトリは、コンテナパターンにおいて相互に連携するため、同一ディレクトリ配下に配置してください。


ブラウザ（可視化）：
```bash
git clone --recursive https://github.com/hakoniwalab/hakoniwa-map-viewer.git
```

箱庭Webサーバー：
```bash
git clone --recursive https://github.com/toppers/hakoniwa-webserver.git
```

箱庭ドローンシミュレータ：
```bash
git clone --recursive https://github.com/toppers/hakoniwa-drone-core.git
```

環境データのブラウザ(設定)・環境シミュレーション/：
```bash
git clone --recursive https://github.com/hakoniwalab/hakoniwa-envsim.git
```

## コンテナパターンのアーキテクチャ

### 動作環境

* OS
  * Windows 11 WSL2
* Docker
  * WSL2上で動作するDockerを利用します。
* ブラウザ
  * Google Chrome / Microsoft Edge / Firefox / Safari


### 全体アーキテクチャ

![architecture](/images/architecture.png)

構成としては、「箱庭」部分が Docker コンテナで動作し、「ブラウザ」部分がホストOS上のブラウザで動作します。

#### PLATEAU(都市データ)

都市データは、PLATEAUオープンデータを利用しています。
サンプルとして、渋谷エリア(緯度経度：35.6625, 139.70625)の3D都市モデルデータを以下で提供しています。

- https://github.com/hakoniwalab/hakoniwa-map-viewer/releases
  - 13113_shibuya-ku_pref_2023_citygml_2_op.glb (約100MB)

上記データをダウンロードし、クローンしたリポジトリの `hakoniwa-map-viewer/assets/models/` 配下に配置してください。

### 箱庭

箱庭は、箱庭ドローンシミュレータおよび環境シミュレータ、箱庭Webサーバー、箱庭ドローン飛行制御を実行する統合ランタイムです。

インストールの手間を省くため、Docker コンテナとして提供しています。

箱庭の docker 環境のセットアップは、以下を参照ください。
- https://github.com/toppers/hakoniwa-drone-core/blob/main/docs/tips/wsl/docker-setup.md

### ブラウザ(設定)

環境データ作成およびドローンの移動ルートのデータは、JSONファイル形式で定義する必要があります。ただ、JSONファイルを直接編集するのは手間がかかるため、ブラウザ上で設定できるようにしたものが「箱庭ブラウザ(設定)」です。

詳細は、以下を参照ください。

- https://github.com/hakoniwalab/hakoniwa-envsim


### ブラウザ(可視化)

本リポジトリであり、箱庭ドローンシミュレータと連携し、ブラウザ上でドローンの移動状況をリアルタイムに可視化するビューアです。

#### 技術スタック
* **three.js**: 3Dビューでのドローン表示
* **leaflet**: オープンストリートマップ上でのドローン移動表示
* **箱庭Webクライアント**:  
  箱庭Webサーバー経由で、シミュレータとWebSocket通信を行うクライアントライブラリ

## 全体の起動手順（概要）

1. 箱庭ドローンシミュレータ（Docker）を起動  
2. 箱庭Webサーバーが起動し、`waiting for webserver` を確認  
3. ブラウザ（可視化）にアクセス  

## 使い方

1. 箱庭ドローンシミュレーションを起動します。
2. `waiting for webserver` のログが表示されたら、ブラウザで次のURLにアクセスします。
   * `http://localhost:8001/src/client/index.html`
3. 画面内の **Drone Count** でドローン数を選択します。
4. **connect** をクリックすると、ドローンの状態が可視化されます。

![ブラウザでの飛行状態の確認方法](images/usage.svg)

### 箱庭ドローンシミュレータの起動方法

docker コンテナとして提供されている箱庭ドローンシミュレータを起動するには、以下のコマンドを実行します。
```bash
bash hakoniwa-drone-core/docker/run.bash
```

```bash
cd hakoniwa-drone-core
```

その後、以下のコマンドで箱庭ドローンシミュレータを起動します。

```bash
 bash ./drone-launcher.bash ./config/launcher/docker-api-mujoco-shibuya-1.json
 ```

 補足：

- `drone-launcher.bash` は、箱庭Launcherです。指定されたコンフィグファイルに基づいて、箱庭アセットを起動します。
- `./config/launcher/` 配下には、複数のコンフィグファイルがありますが、今回の例では以下のファイルを指定しています。
  - `docker-api-mujoco-shibuya-1.json` 
      - Dockerコンテナ上で、MuJoCo物理エンジンを利用し、PLATEAU渋谷エリアの都市の中を１台のドローンが飛行するものです。
- 他のコンフィグファイルを指定することで、異なるシミュレーションを実行できます。
  - 2台同時の場合： `docker-api-mujoco-shibuya-2.json`
  - 10台同時の場合： `docker-api-mujoco-shibuya-10.json`


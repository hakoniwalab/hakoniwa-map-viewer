from __future__ import annotations

import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]


class MapViewerContractTest(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text(encoding="utf-8")

    def test_submodule_contract(self) -> None:
        gitmodules = self.read(".gitmodules")
        self.assertIn("thirdparty/hakoniwa-threejs-drone", gitmodules)
        self.assertIn("hakoniwalab/hakoniwa-threejs-drone.git", gitmodules)
        self.assertTrue(
            (ROOT / "thirdparty/hakoniwa-threejs-drone/tools/hako.py").is_file()
        )

    def test_html_composes_map_and_threejs_regions(self) -> None:
        html = self.read("src/client/index.html")
        self.assertIn('id="map"', html)
        self.assertIn('id="three-root"', html)
        self.assertIn('src="./src/ui.js"', html)
        self.assertIn("Hakoniwa Map + 3D Drone Viewer", html)

    def test_three_main_layout_places_map_in_bottom_left_inset(self) -> None:
        html = self.read("src/client/index.html")
        self.assertIn("body.layout-three-main #map-container", html)
        self.assertIn("body.layout-three-main.panel-hidden #panel", html)
        self.assertIn("get('panel') === 'hidden'", html)
        self.assertIn("left: 16px", html)
        self.assertIn("bottom: 16px", html)
        self.assertIn("get('layout') === 'three-main'", html)

    def test_ui_uses_public_threejs_viewer_api(self) -> None:
        ui = self.read("src/client/src/ui.js")
        self.assertIn(
            'DEFAULT_THREEJS_ROOT = "/thirdparty/hakoniwa-threejs-drone"', ui
        )
        self.assertIn('DEFAULT_VIEWER_CONFIG_NAME = "viewer-config-legacy.json"', ui)
        self.assertIn("/src/public/drone_viewer.js", ui)
        self.assertIn("createDroneViewer", ui)
        self.assertIn("viewer.connectPdu", ui)
        self.assertIn("viewer.getVehicles", ui)
        self.assertIn('kind: "vehicle"', ui)
        self.assertTrue((ROOT / "images/car.svg").is_file())
        self.assertIn("getViewerConfigPathFromQuery", ui)
        self.assertIn('QUERY.get("autoConnect") === "true"', ui)
        self.assertIn('QUERY.get("originLat")', ui)

    def test_fault_panel_is_mounted_only_for_configured_targets(self) -> None:
        html = self.read("src/client/index.html")
        ui = self.read("src/client/src/ui.js")
        self.assertIn('id="fault-panel-container"', html)
        self.assertIn("viewer.getFaultInjectionConfig?.()", ui)
        self.assertIn("/src/fault_injection/fault_panel.js", ui)
        self.assertIn("mountFaultPanel(container, viewer)", ui)

    def test_coordinate_conversion_contract_is_explicit(self) -> None:
        frame = self.read("src/client/src/frame.js")
        self.assertIn('defs["EPSG:6677"]', frame)
        self.assertIn("function rosToEnuFrame", frame)
        self.assertIn("return [-y_ros, x_ros, z_ros]", frame)
        self.assertIn("function ENUToLatLon", frame)

    def test_large_fleet_map_presentation_is_adaptive(self) -> None:
        ui = self.read("src/client/src/ui.js")
        self.assertIn("function fleetMarkerSize", ui)
        self.assertIn("if (droneCount <= 128) return 14", ui)
        self.assertIn("FLEET_TRAIL_KEEP_MS = 1200", ui)
        self.assertIn("SELECTED_TRAIL_KEEP_MS = 4000", ui)
        self.assertIn("selected ? 2.5 : 1", ui)
        self.assertNotIn("await viewer.syncDroneStates()", ui)

    def test_readme_describes_current_component_boundary(self) -> None:
        readme = self.read("README.md")
        self.assertNotIn("hakoniwa-webserver", readme)
        self.assertIn("python tools/hako.py doctor", readme)
        self.assertIn("hakoniwa-pdu-bridge-core", readme)
        self.assertIn("hakoniwa-threejs-drone", readme)
        self.assertIn("drone-single-mujoco-threejs-gamepad", readme)
        self.assertIn("13113_shibuya-ku_pref_2023_citygml_2_op.glb", readme)
        self.assertIn("標準起動には不要", readme)

    def test_optional_plateau_asset_is_not_required_by_doctor(self) -> None:
        hako = self.read("tools/hako.py")
        required_section = hako.split("REQUIRED_FILES =", 1)[1].split(
            "def _display", 1
        )[0]
        self.assertNotIn("SHIBUYA_GLB", required_section)
        self.assertIn("optional PLATEAU Shibuya GLB", hako)

    def test_trails_can_be_pinned_when_the_viewer_supports_it(self) -> None:
        html = self.read("src/client/index.html")
        self.assertIn('id="trail-pin-btn"', html)
        self.assertIn('title="Keep the current trails (green, then purple, ...) and start new ones"', html)
        self.assertIn('id="trail-unpin-btn"', html)
        self.assertIn('title="Remove the kept trails"', html)
        ui = self.read("src/client/src/ui.js")
        self.assertIn("typeof viewer?.pinTrails === 'function'", ui)
        self.assertIn("viewer?.pinTrails?.()", ui)
        self.assertIn("viewer?.clearPinnedTrails?.()", ui)

    def test_a_fixed_camera_shot_can_come_from_the_url(self) -> None:
        ui = self.read("src/client/src/ui.js")
        # cameraEnu / lookAtEnu (/ cameraFov): the same shot for several runs, no following.
        self.assertIn("parse('cameraEnu')", ui)
        self.assertIn("parse('lookAtEnu')", ui)
        self.assertIn("params.get('cameraFov')", ui)
        self.assertIn("viewer.setCameraPose(cameraPose)", ui)
        # attachedCameras=off hides the picture-in-picture for screenshots.
        self.assertIn("get('attachedCameras') === 'off'", ui)
        self.assertIn("viewer.setAttachedCamerasEnabled?.(false)", ui)
        self.assertIn("window.hakoniwaViewer = viewer", ui)


if __name__ == "__main__":
    unittest.main()

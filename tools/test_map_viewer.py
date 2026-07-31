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

    def test_ui_uses_public_threejs_viewer_api(self) -> None:
        ui = self.read("src/client/src/ui.js")
        self.assertIn(
            'DEFAULT_THREEJS_ROOT = "/thirdparty/hakoniwa-threejs-drone"', ui
        )
        self.assertIn('DEFAULT_VIEWER_CONFIG_NAME = "viewer-config-legacy.json"', ui)
        self.assertIn("/src/public/drone_viewer.js", ui)
        self.assertIn("createDroneViewer", ui)
        self.assertIn("viewer.connectPdu", ui)

    def test_coordinate_conversion_contract_is_explicit(self) -> None:
        frame = self.read("src/client/src/frame.js")
        self.assertIn('defs["EPSG:6677"]', frame)
        self.assertIn("function rosToEnuFrame", frame)
        self.assertIn("return [-y_ros, x_ros, z_ros]", frame)
        self.assertIn("function ENUToLatLon", frame)

    def test_readme_describes_current_component_boundary(self) -> None:
        readme = self.read("README.md")
        self.assertNotIn("hakoniwa-webserver", readme)
        self.assertIn("python tools/hako.py doctor", readme)
        self.assertIn("hakoniwa-pdu-bridge-core", readme)
        self.assertIn("hakoniwa-threejs-drone", readme)
        self.assertIn("drone-single-mujoco-threejs-gamepad", readme)
        self.assertIn("13113_shibuya-ku_pref_2023_citygml_2_op.glb", readme)
        self.assertIn("標準起動には不要", readme)

    def test_optional_plateau_asset_is_not_required_by_repository(self) -> None:
        # The large Shibuya GLB is distributed separately and must not become a
        # required checkout artifact for doctor, test, or smoke.
        self.assertFalse(
            (ROOT / "13113_shibuya-ku_pref_2023_citygml_2_op.glb").is_file()
        )


if __name__ == "__main__":
    unittest.main()

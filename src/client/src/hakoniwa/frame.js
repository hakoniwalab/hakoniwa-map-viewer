// src/client/src/hakoniwa/frame.js
import proj4 from 'proj4';

export const HakoniwaFrame = (() => {
  // EPSG:6677 を一度だけ登録
  if (!proj4.defs["EPSG:6677"]) {
    proj4.defs(
      "EPSG:6677",
      "+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 " +
        "+k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs"
    );
  }

  function latlonToENU(originLat, originLon, lat, lon) {
    const p0 = proj4("EPSG:4326", "EPSG:6677", [originLon, originLat]);
    const p1 = proj4("EPSG:4326", "EPSG:6677", [lon, lat]);
    return [p1[0] - p0[0], p1[1] - p0[1]];
  }

  function ENUToLatLon(originLat, originLon, x, y) {
    const p0 = proj4("EPSG:4326", "EPSG:6677", [originLon, originLat]);
    const p1 = [p0[0] + x, p0[1] + y];
    const geo = proj4("EPSG:6677", "EPSG:4326", p1);
    return [geo[1], geo[0]];
  }

  function deg2rad(d){ return d * Math.PI / 180; }
  function rad2deg(r){ return r * 180 / Math.PI; }

  function enuToRosFrame(enu_x, enu_y, enu_z) {
    return [enu_y, -enu_x, enu_z];
  }
  function rosToEnuFrame(x_ros, y_ros, z_ros){
    return [-y_ros, x_ros, z_ros];
  }

  return {
    latlonToENU,
    ENUToLatLon,
    deg2rad,
    rad2deg,
    enuToRosFrame,
    rosToEnuFrame,
  };
})();

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
window.THREE = THREE;
window.THREEX = { OrbitControls, RoundedBoxGeometry, RoomEnvironment, CSS2DRenderer, CSS2DObject, BufferGeometryUtils };

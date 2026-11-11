import * as THREE from 'three';

/** Write surface metadata after Three's OPAQUE chunk has written its alpha. */
function outputAlpha(material, alpha, key) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(/\}\s*$/, `\n  gl_FragColor.a = ${alpha.toFixed(1)};\n}\n`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

/** colorRT alpha is a water-coverage channel; the final canvas remains opaque. */
export function markWaterMaterial(material) {
  material.userData.surfaceRole = 'water';
  return outputAlpha(material, 0, 'yichang-water-coverage-v1');
}

/** A half-alpha normal marks a visible surface that should not receive ink. */
export function createInklessNormalMaterial() {
  return outputAlpha(new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide, blending: THREE.NoBlending,
  }), .5, 'yichang-normal-inkless-v1');
}

/** Opaque trees still occlude the river. Only non-depth overlays are excluded. */
export function depthlessOverlays(objects) {
  return [...new Set(objects || [])].filter(object => {
    if (!object?.isMesh) return true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    return materials.every(material => material.transparent && material.depthWrite === false);
  });
}

import ShotEngineType from "@shot-engine/types";

export function createDefaultCubeAssetMesh(){
    const [v0, v1, v2, v3, v4, v5, v6, v7] = [
        [1, 1, 1],   // v0
        [-1, 1, 1],  // v1
        [-1, -1, 1], // v2
        [1, -1, 1],  // v3
        [1, -1, -1], // v4
        [1, 1, -1],  // v5
        [-1, 1, -1], // v6
        [-1, -1, -1] // v7
    ];
    const [front, back, top, down, right, left] = [
        [0, 0, 1],   // front
        [0, 0, -1],  // back
        [0, 1, 0], // top
        [0, -1, 0],  // down
        [1, 0, 0],  // right
        [-1, 0, 0], // left
    ];
    const cubeAssetMesh: ShotEngineType.MeshAsset = {
        primitives: [{
            attribute: {
                positions: new Float32Array([
                    ...v0, ...v1, ...v2, ...v3, // front
                    ...v0, ...v3, ...v4, ...v5, // right
                    ...v0, ...v5, ...v6, ...v1, // top
                    ...v1, ...v6, ...v7, ...v2, // left
                    ...v3, ...v2, ...v7, ...v4, // down
                    ...v4, ...v7, ...v6, ...v5, // back
                ]),
                normals: new Float32Array([
                    ...front, ...front, ...front, ...front,
                    ...right, ...right, ...right, ...right,
                    ...top, ...top, ...top, ...top,
                    ...left, ...left, ...left, ...left,
                    ...down, ...down, ...down, ...down,
                    ...back, ...back, ...back, ...back,
                ]),
                uvs: new Float32Array([
                    // front
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,

                    // right
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,

                    // top
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,

                    // left
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,

                    // down
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,

                    // back
                    1, 1,
                    0, 1,
                    0, 0,
                    1, 0,
                ])
            },
            indices: new Uint32Array(
                [
                    0, 1, 2, 0, 2, 3,       // front
                    4, 5, 6, 4, 6, 7,       // right
                    8, 9, 10, 8, 10, 11,    // up
                    12, 13, 14, 12, 14, 15, // left
                    16, 17, 18, 16, 18, 19, // down
                    20, 21, 22, 20, 22, 23, // back
                ]
            )
        }]
    }

    return cubeAssetMesh;
}

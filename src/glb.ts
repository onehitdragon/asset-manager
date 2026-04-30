import { Document, NodeIO, Node, Texture, Mesh } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import ShotEngineType from "@shot-engine/types";
import { imageToRaw } from './imageToRaw';

type GLB = {
    textures: GLBTexture[],
    meshes: GLBMesh[],
    gameObjects: ShotEngineType.GameObject[]
}
type GLBTexture = {
    name: string,
    imageAsset: ShotEngineType.ImageAsset
}
type GLBMesh = {
    name: string,
    meshAsset: ShotEngineType.MeshAsset
}

// readGLBFile(path.join(process.cwd(), "test", "ark-rm", "Untitled.glb"));
export async function readGLBFile(filePath: string){
    const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({});

    const document = await io.read(filePath);
    const root = document.getRoot();
    
    const glb: GLB = {
        textures: [],
        meshes: [],
        gameObjects: []
    };
    for(const texture of root.listTextures()){
        const image = texture.getImage();
        const raw = await imageToRaw(image ?? new Uint8Array());
        glb.textures.push({
            name: texture.getName(),
            imageAsset: {
                width: raw.info.width,
                height: raw.info.height,
                data: raw.data
            }
        });
    }
    for(const mesh of root.listMeshes()){
        const primitives = mesh.listPrimitives().map((e => {
            const positionAttr = e.getAttribute("POSITION");
            const positions = positionAttr ? positionAttr.getArray() as Float32Array : new Float32Array();
            const normalAttr = e.getAttribute("NORMAL");
            const normals = normalAttr ? normalAttr.getArray() as Float32Array : new Float32Array();
            const indiceAttr = e.getIndices();
            const indices = indiceAttr ? new Uint32Array(indiceAttr.getArray() as ArrayLike<number>) : new Uint32Array();
            return {
                attribute: {
                    positions,
                    normals
                },
                indices
            }
        }));
        glb.meshes.push({
            name: mesh.getName(),
            meshAsset: { primitives } 
        });
    }

    const textureMap = new Map<Texture, number>(root.listTextures().map((e, idx) => [e, idx]));
    const meshMap = new Map<Mesh, number>(root.listMeshes().map((e, idx) => [e, idx]));
    const scene = root.getDefaultScene();
    if(!scene) return;
    for(const node of scene.listChildren()){
        const gameObject = createGameObject(node, meshMap);
        glb.gameObjects.push(gameObject);
    }

    return glb;
}

function createGameObject(node: Node, meshMap: Map<Mesh, number>){
    let gameObject: ShotEngineType.GameObject = {
        id: "",
        name: node.getName(),
        components: [],
        childs: []
    };
    gameObject.components.push(
        {
            type: "Transfrom",
            id: "",
            pos: {
                x: node.getTranslation()[0],
                y: node.getTranslation()[1],
                z: node.getTranslation()[2]
            },
            rot: {
                x: node.getRotation()[0],
                y: node.getRotation()[1],
                z: node.getRotation()[2],
                w: node.getRotation()[3]
            },
            scale: {
                x: node.getScale()[0],
                y: node.getScale()[1],
                z: node.getScale()[2]
            },
        }
    );
    const mesh = node.getMesh();
    if(mesh){
        let meshIndex = meshMap.get(mesh);
        if(meshIndex === undefined) meshIndex = -1;
        gameObject.components.push(
            {
                type: "Mesh",
                id: "",
                meshRef: meshIndex as any
            }
        );
    }
    for(const child of node.listChildren()){
        gameObject.childs.push(
            createGameObject(child, meshMap)
        );
    }

    return gameObject;
}

function printNode(node: Node, space = 0){
    let sp = "";
    for(let i = 0; i < space; i++) sp += "  ";

    console.log(sp, "-", node.getName());
    console.log(sp, "Transforms:", node.getTranslation(), node.getRotation(), node.getScale());
    const mesh = node.getMesh();
    if(mesh){
        console.log(sp, "Mesh:", mesh.getName());
        for(const prim of mesh.listPrimitives()){
            console.log(sp, prim.getName());
            console.log(sp, prim.getAttribute("POSITION")?.getArray());
            console.log(sp, prim.getIndices()?.getArray());
        }
    }

    for(const childNode of node.listChildren()){
        printNode(childNode, space + 1);
    }
}

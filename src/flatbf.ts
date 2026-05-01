import { Builder, Offset, ByteBuffer } from "flatbuffers";
import path from "node:path";
import ShotEngineType from "@shot-engine/types";
import fs from "fs-extra";
import {
    Vec3, Vec4,
    ImageAsset, PrimitiveAttribute, Primitive, MeshAsset, PrefabAsset, 
    SceneNode, GameObject, GameObjectPrefab, Component, Transform, Mesh,
} from "../fbs-gen/fbsengine";

export function saveImageAssetBinary(imageAsset: ShotEngineType.ImageAsset, filePath: string){
    const builder = new Builder(1024);
    const dataOffset = ImageAsset.createDataVector(builder, imageAsset.data);
    ImageAsset.startImageAsset(builder);
    ImageAsset.addWidth(builder, imageAsset.width);
    ImageAsset.addHeight(builder, imageAsset.height);
    ImageAsset.addData(builder, dataOffset);
    const offset = ImageAsset.endImageAsset(builder);
    builder.finish(offset);

    const bytes = builder.asUint8Array();
    fs.writeFileSync(filePath, bytes);
}
export function saveMeshAssetBinary(meshAsset: ShotEngineType.MeshAsset, filePath: string){
    const builder = new Builder(1024);
    const primitiveOffsets: Offset[] = [];
    for(const prim of meshAsset.primitives){
        const positionsOffset = PrimitiveAttribute.createPositionsVector(builder, prim.attribute.positions);
        const normalsOffset = PrimitiveAttribute.createNormalsVector(builder, prim.attribute.normals);
        PrimitiveAttribute.startPrimitiveAttribute(builder);
        PrimitiveAttribute.addPositions(builder, positionsOffset);
        PrimitiveAttribute.addNormals(builder, normalsOffset);
        const attrOffset = PrimitiveAttribute.endPrimitiveAttribute(builder);

        const indicesOffset = Primitive.createIndicesVector(builder, prim.indices);
        Primitive.startPrimitive(builder);
        Primitive.addAttribute(builder, attrOffset);
        Primitive.addIndices(builder, indicesOffset);
        primitiveOffsets.push(Primitive.endPrimitive(builder));
    }
    const primitivesOffset = MeshAsset.createPrimitivesVector(builder, primitiveOffsets);
    MeshAsset.startMeshAsset(builder);
    MeshAsset.addPrimitives(builder, primitivesOffset);
    const meshOffset = MeshAsset.endMeshAsset(builder);
    builder.finish(meshOffset);

    const bytes = builder.asUint8Array();
    fs.writeFileSync(filePath, bytes);
}
export function savePrefabAssetBinary(prefabAsset: ShotEngineType.PrefabAsset, filePath: string){
    const builder = new Builder(1024);
    function recurGameObject(sceneNode: ShotEngineType.SceneNode): Offset{
        if("prefabRef" in sceneNode){
            const goPrefab = sceneNode;
            const prefabRefOffset = builder.createString(goPrefab.prefabRef);
            GameObjectPrefab.startGameObjectPrefab(builder);
            GameObjectPrefab.addPrefabRef(builder, prefabRefOffset);
            const goPrefabOffset = GameObjectPrefab.endGameObjectPrefab(builder);
            return goPrefabOffset;
        }
        const go = sceneNode;
        const childOffsets: Offset[] = [];
        const childTypeOffsets: Offset[] = [];
        for(const child of go.childs){
            const sceneNodeOffset = recurGameObject(child);
            if("prefabRef" in child){
                childTypeOffsets.push(SceneNode.GameObjectPrefab);
            }
            else{
                childTypeOffsets.push(SceneNode.GameObject);
            }
            childOffsets.push(sceneNodeOffset);
        }
        const componentOffsets: Offset[] = [];
        const componentTypeOffsets: Offset[] = [];
        for(const component of go.components){
            let componentOffset: number | undefined;
            if(component.type === "Transfrom"){
                Vec3.startVec3(builder);
                Vec3.addX(builder, component.pos.x);
                Vec3.addY(builder, component.pos.y);
                Vec3.addZ(builder, component.pos.z);
                const posOffset = Vec3.endVec3(builder);
                Vec4.startVec4(builder);
                Vec4.addX(builder, component.rot.x);
                Vec4.addY(builder, component.rot.y);
                Vec4.addZ(builder, component.rot.z);
                Vec4.addW(builder, component.rot.w);
                const rotOffset = Vec4.endVec4(builder);
                Vec3.startVec3(builder);
                Vec3.addX(builder, component.scale.x);
                Vec3.addY(builder, component.scale.y);
                Vec3.addZ(builder, component.scale.z);
                const scaleOffset = Vec3.endVec3(builder);
                const idOffset = builder.createString(component.id);
                Transform.startTransform(builder);
                Transform.addId(builder, idOffset);
                Transform.addPos(builder, posOffset);
                Transform.addRot(builder, rotOffset);
                Transform.addScale(builder, scaleOffset);
                componentOffset = Transform.endTransform(builder);
                componentTypeOffsets.push(Component.Transform);
            }
            else if(component.type === "Mesh"){
                const idOffset = builder.createString(component.id);
                const meshRefOffset = builder.createString(component.meshRef);
                Mesh.startMesh(builder);
                Mesh.addId(builder, idOffset);
                Mesh.addMeshRef(builder, meshRefOffset);
                componentOffset = Mesh.endMesh(builder);
                componentTypeOffsets.push(Component.Mesh);
            }
            if(componentOffset !== undefined){
                componentOffsets.push(componentOffset);
            }
        }
        const idOffset = builder.createString(go.id);
        const nameOffset = builder.createString(go.name);
        const componentsOffset = GameObject.createComponentsVector(builder, componentOffsets);
        const componentTypesOffset = GameObject.createComponentsTypeVector(builder, componentTypeOffsets);
        const childsOffset = GameObject.createChildsVector(builder, childOffsets);
        const childTypesOffset = GameObject.createChildsTypeVector(builder, childTypeOffsets);
        GameObject.startGameObject(builder);
        GameObject.addId(builder, idOffset);
        GameObject.addName(builder, nameOffset);
        GameObject.addComponents(builder, componentsOffset);
        GameObject.addComponentsType(builder, componentTypesOffset);
        GameObject.addChilds(builder, childsOffset);
        GameObject.addChildsType(builder, childTypesOffset);
        const goOffset = GameObject.endGameObject(builder);
        return goOffset;
    }
    const goRootOffset = recurGameObject(prefabAsset.root);
    PrefabAsset.startPrefabAsset(builder);
    PrefabAsset.addRoot(builder, goRootOffset);
    const prefabAssetOffset = PrefabAsset.endPrefabAsset(builder);
    builder.finish(prefabAssetOffset);

    const bytes = builder.asUint8Array();
    fs.writeFileSync(filePath, bytes);
}

function readImageAssetTest(){
    const filePath = path.join(process.cwd(), ".assets", "d21150ca-3313-4a12-bc40-9216ea75b821");
    const bytes = new Uint8Array(fs.readFileSync(filePath));
    const byteBuffer = new ByteBuffer(bytes);
    const image = ImageAsset.getRootAsImageAsset(byteBuffer);
    console.log(image.width(), image.height(), image.dataArray());
}
// readImageAssetTest();
function readPrefabAssetTest(){
    const filePath = path.join(process.cwd(), ".assets", "c2db5e8e-a5cc-4507-8059-d7eb57dc08c1");
    const bytes = new Uint8Array(fs.readFileSync(filePath));
    const byteBuffer = new ByteBuffer(bytes);
    const prefabAsset = PrefabAsset.getRootAsPrefabAsset(byteBuffer);
    const root = prefabAsset.root()!;
    function recurPrint(gameObject: typeof root, space = 0){
        let spaceStr = "";
        for(let i = 0; i < space; i++) spaceStr += " ";
        console.log(spaceStr, "name:", gameObject.name(), "id: ", gameObject.id());

        console.log(spaceStr, "componentLength:", gameObject.componentsLength());
        for(let i = 0; i < gameObject.componentsLength(); i++){
            const componentType = gameObject.componentsType(i);
            console.log(spaceStr, "componentType:", componentType);
            if(componentType === Component.Transform){
                const transform = gameObject.components(i, new Transform()) as Transform;
                const pos = transform.pos() as Vec3;
                const rot = transform.rot() as Vec4;
                const scale = transform.scale() as Vec3;
                console.log(spaceStr, "pos:", pos.x(), pos.y(), pos.z());
                console.log(spaceStr, "rot:", rot.x(), rot.y(), rot.z(), rot.w());
                console.log(spaceStr, "scale:", scale.x(), scale.y(), scale.z());
            }
            if(componentType === Component.Mesh){
                const mesh = gameObject.components(i, new Mesh()) as Mesh;
                const meshRef = mesh.meshRef()!;
                console.log(spaceStr, "meshRef:", meshRef);
            }
        }

        console.log(spaceStr, "childLength:", gameObject.childsLength());
        for(let i = 0; i < gameObject.childsLength(); i++){
            const childType = gameObject.childsType(i);
            console.log(spaceStr, "childType:", childType);
            if(childType === SceneNode.GameObject){
                const go = gameObject.childs(i, new GameObject()) as GameObject;
                recurPrint(go, space + 1);
            }
            if(childType === SceneNode.GameObjectPrefab){
                const goPrefab = gameObject.childs(i, new GameObjectPrefab()) as GameObjectPrefab;
                console.log(spaceStr, "prefabRef:", goPrefab.prefabRef());
            }
        }
    }
    recurPrint(root);
}
// readPrefabAssetTest();

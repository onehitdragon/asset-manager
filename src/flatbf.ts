import { Builder, Offset, ByteBuffer } from "flatbuffers";
import path from "node:path";
import ShotEngineType from "@shot-engine/types";
import fs from "fs-extra";
import { ImageAsset, PrimitiveAttribute, Primitive, MeshAsset } from "../fbs-gen/fbsengine";

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

function readtest(){
    const filePath = path.join(process.cwd(), ".assets", "d21150ca-3313-4a12-bc40-9216ea75b821");
    const bytes = fs.readFileSync(filePath);
    const byteBuffer = new ByteBuffer(bytes);
    const image = ImageAsset.getRootAsImageAsset(byteBuffer);
    console.log(image.width(), image.height(), image.dataArray());
}
readtest();

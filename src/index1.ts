import Database from 'better-sqlite3';
import * as fsWalk from '@nodelib/fs.walk';
import path from "node:path";
import fs from "fs-extra";
import xxhash, { type XXHashAPI } from "xxhash-wasm";
import { v4 as uuidv4 } from "uuid";
import * as schema from "./schema";
import { db, filesQuery, assetsQuery, FileRow, AssetRow } from "./db";
import ShotEngineType from "@shot-engine/types";
import sharp from "sharp";
import { readGLBFile } from './glb';
import { saveImageAssetBinary, saveMeshAssetBinary } from './flatbf';
import { imageToRaw } from './imageToRaw';

const MAIN_DIR = path.join(process.cwd(), "test", "ark-rm2", "Assets");
const MAIN_DIR2 = path.join(process.cwd(), "test", "ark-rm");
const ASSET_DIR = MAIN_DIR2;

async function rescan(){
    let now = performance.now();
    console.log(now, "ms");

    const fileRowsDB = filesQuery.gets.all() as FileRow[];
    const hashCache = new Map<string, string>();
    for(const fileRow of fileRowsDB){
        if(!fileRow.path) continue;
        if(!fs.existsSync(fileRow.path)){
            filesQuery.updatePath.run(null, fileRow.uuid);
            fileRow.path = null;
            fileRow.dirty = true;
            continue;
        }
        const hash = await hashFile(fileRow.path);
        hashCache.set(fileRow.path, hash);
        if(fileRow.hash !== hash){
            filesQuery.updateHash.run(hash, fileRow.uuid);
            fileRow.hash = hash;
            fileRow.dirty = true;
        }
    }

    console.log(performance.now() - now, "ms");
    now = performance.now();

    const hashToFileRows = new Map<string, FileRow[]>();
    for(const fileRow of fileRowsDB){
        const exist = hashToFileRows.get(fileRow.hash);
        if(!exist) hashToFileRows.set(fileRow.hash, [fileRow]);
        else exist.push(fileRow);
    }
    const entries = fsWalk.walkSync(ASSET_DIR);
    for(const entry of entries){
        if(entry.dirent.isDirectory()) continue;
        const hash = hashCache.get(entry.path) || await hashFile(entry.path);
        let fileRows = hashToFileRows.get(hash);
        if(!fileRows){
            const fileRow: FileRow = {
                uuid: uuidv4(),
                hash,
                path: entry.path,
                dirty: true
            }
            filesQuery.insert.run(fileRow.uuid, fileRow.hash, fileRow.path);
            hashToFileRows.set(fileRow.hash, [fileRow]);
            fileRowsDB.push(fileRow);
        }
        else if(!fileRows.some(e => e.path === entry.path)){
            let updated = false;
            for(const fileRow of fileRows){
                if(!fileRow.path){
                    filesQuery.updatePath.run(entry.path, fileRow.uuid);
                    fileRow.path = entry.path;
                    fileRow.dirty = true;
                    updated = true;
                    break;
                }
            }
            if(!updated){
                const fileRow: FileRow = {
                    uuid: uuidv4(),
                    hash,
                    path: entry.path,
                    dirty: true
                }
                filesQuery.insert.run(fileRow.uuid, fileRow.hash, fileRow.path);
                fileRows.push(fileRow);
                fileRowsDB.push(fileRow);
            }
        }
    }

    console.log(performance.now() - now, "ms");
    now = performance.now();

    const assetRowsDB = assetsQuery.gets.all() as AssetRow[];
    const fileIdToAssetRows = new Map<string, AssetRow[]>();
    for(const assetRow of assetRowsDB){
        const exist = fileIdToAssetRows.get(assetRow.fileId);
        if(!exist) fileIdToAssetRows.set(assetRow.fileId, [assetRow]);
        else exist.push(assetRow);
    }
    
    for(const fileRow of fileRowsDB){
        const assetRows = fileIdToAssetRows.get(fileRow.uuid) || [];
        if(!fileRow.path){
            filesQuery.delete.run(fileRow.uuid);
            for(const assetRow of assetRows) deleteGenAsset(assetRow.uuid);
        }
        else if(fileRow.dirty){
            if(isImageFile(fileRow.path)){
                await syncNotContainer(fileRow, assetRows, "image");
            }
            else if(isGLBFile(fileRow.path)){
                syncGLBContainer(fileRow, assetRows);
            }
            else{
                await syncNotContainer(fileRow, assetRows, "other");
            }
        }
    }

    console.log(performance.now() - now, "ms");
    now = performance.now();
}

let xxHashAPI: XXHashAPI | undefined;
async function hashFile(filePath: string){
    if(!xxHashAPI) xxHashAPI = await xxhash();
    const hash = xxHashAPI.create64();
    
    return new Promise<string>((resolve, reject) => {
        const stream = fs.createReadStream(filePath);
        stream.on("data", chunk => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest().toString()));
        stream.on("error", reject);
    });
}
async function hashImageAsset(imageAsset: ShotEngineType.ImageAsset) {
    if(!xxHashAPI) xxHashAPI = await xxhash();
    const hash = xxHashAPI.create64();
    
    hash.update(imageAsset.data);
    return hash.digest().toString();
}
async function hashMeshAsset(meshAsset: ShotEngineType.MeshAsset) {
    if(!xxHashAPI) xxHashAPI = await xxhash();
    const hash = xxHashAPI.create64();
    
    hash.update(new Uint8Array(Uint32Array.of(meshAsset.primitives.length).buffer));
    for(const prim of meshAsset.primitives){
        const { attribute, indices } = prim;
        const { positions, normals } = attribute;

        hash.update(new Uint8Array(Uint32Array.of(positions.length).buffer));
        hash.update(new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength));

        hash.update(new Uint8Array(Uint32Array.of(normals.length).buffer));
        hash.update(new Uint8Array(normals.buffer, normals.byteOffset, normals.byteLength));

        hash.update(new Uint8Array(Uint32Array.of(indices.length).buffer));
        hash.update(new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength));
    }
    return hash.digest().toString();
}
async function hashObject(object: Object) {
    if(!xxHashAPI) xxHashAPI = await xxhash();
    const hash = xxHashAPI.create64();
    
    hash.update(JSON.stringify(object));
    return hash.digest().toString(); 
}

async function syncNotContainer(fileRow: FileRow, assetRows: AssetRow[], type: AssetRow["type"]){
    const usedSet = new Set<string>();
    for(const assetRow of assetRows){
        if(assetRow.type !== type) continue;
        usedSet.add(assetRow.uuid);
        if(assetRow.hash !== fileRow.hash){
            assetsQuery.updateHash.run(fileRow.hash, assetRow.uuid);
            assetRow.hash = fileRow.hash;
            await genAssetWithFile(fileRow, assetRow, type);
        }
        const name = path.basename(fileRow.path || "");
        if(assetRow.name !== name){
            assetsQuery.updateName.run(name, assetRow.uuid);
            assetRow.name = name;
        }
        break;
    }
    if(usedSet.size === 0){
        const assetRow: AssetRow = {
            uuid: uuidv4(),
            fileId: fileRow.uuid,
            hash: fileRow.hash,
            type,
            name: path.basename(fileRow.path || ""),
            property: createAssetDefaultProterpty(type)
        };
        assetsQuery.insert.run(
            assetRow.uuid,
            assetRow.fileId,
            assetRow.hash,
            assetRow.type,
            assetRow.name,
            assetRow.property
        );
        usedSet.add(assetRow.uuid);
        assetRows.push(assetRow);
        await genAssetWithFile(fileRow, assetRow, type);
    }
    const uuids = assetRows.filter(e => !usedSet.has(e.uuid)).map(e => e.uuid);
    assetsQuery.deletesTransaction(uuids);
    uuids.forEach(e => deleteGenAsset(e))
}
async function syncGLBContainer(fileRow: FileRow, assetRows: AssetRow[]){
    if(!fileRow.path) return;
    const glb = await readGLBFile(fileRow.path);
    if(!glb) return;
    const usedSet = new Set<string>();
    const { textures, meshes, gameObjects } = glb;
    const textureHashes: string[] = [];
    const meshHashes: string[] = [];
    for(const texture of textures){
        const hash = await hashImageAsset(texture.imageAsset);
        textureHashes.push(hash);
        const assetRow = assetRows.find(e => e.hash === hash);
        if(assetRow){
            usedSet.add(assetRow.uuid);
        }
        else{
            const assetRow: AssetRow = {
                uuid: uuidv4(),
                fileId: fileRow.uuid,
                hash,
                type: "image",
                name: path.basename(fileRow.path) + "/" + texture.name,
                property: createAssetDefaultProterpty("image")
            };
            assetsQuery.insert.run(
                assetRow.uuid,
                assetRow.fileId,
                assetRow.hash,
                assetRow.type,
                assetRow.name,
                assetRow.property
            );
            usedSet.add(assetRow.uuid);
            assetRows.push(assetRow);
            genImageAsset(assetRow, texture.imageAsset);
        }
    }
    for(const mesh of meshes){
        const hash = await hashMeshAsset(mesh.meshAsset);
        meshHashes.push(hash);
        const assetRow = assetRows.find(e => e.hash === hash);
        if(assetRow){
            usedSet.add(assetRow.uuid);
        }
        else{
            const assetRow: AssetRow = {
                uuid: uuidv4(),
                fileId: fileRow.uuid,
                hash,
                type: "mesh",
                name: path.basename(fileRow.path) + "/" + mesh.name,
                property: createAssetDefaultProterpty("mesh")
            };
            assetsQuery.insert.run(
                assetRow.uuid,
                assetRow.fileId,
                assetRow.hash,
                assetRow.type,
                assetRow.name,
                assetRow.property
            );
            usedSet.add(assetRow.uuid);
            assetRows.push(assetRow);
            genMeshAsset(assetRow, mesh.meshAsset);
        }
    }
    function updateGameObjectDependency(go: ShotEngineType.GameObject){
        for(const component of go.components){
            if(component.type === "Mesh"){
                component.meshRef = meshHashes[Number(component.meshRef)];
            }
        }
        for(const child of go.childs) updateGameObjectDependency(child as ShotEngineType.GameObject);
    }
    for(const gameObject of gameObjects){
        updateGameObjectDependency(gameObject);
    }
    for(const gameObject of gameObjects){
        const hash = await hashObject(gameObject);
        const assetRow = assetRows.find(e => e.hash === hash);
        if(assetRow){
            usedSet.add(assetRow.uuid);
        }
        else{
            const assetRow: AssetRow = {
                uuid: uuidv4(),
                fileId: fileRow.uuid,
                hash,
                type: "prefab",
                name: path.basename(fileRow.path) + "/" + gameObject.name,
                property: createAssetDefaultProterpty("prefab")
            };
            assetsQuery.insert.run(
                assetRow.uuid,
                assetRow.fileId,
                assetRow.hash,
                assetRow.type,
                assetRow.name,
                assetRow.property
            );
            usedSet.add(assetRow.uuid);
            assetRows.push(assetRow);
            genDefaultAsset(fileRow, assetRow);
        }
    }

    const uuids = assetRows.filter(e => !usedSet.has(e.uuid)).map(e => e.uuid);
    assetsQuery.deletesTransaction(uuids);
    uuids.forEach(e => deleteGenAsset(e))
}
function createAssetDefaultProterpty(type: AssetRow["type"]){
    if(type === "image"){
        return schema.defaultImageAssetJSON;
    }
    else if(type === "mesh"){
        return schema.defaultMeshAssetJSON;
    }
    else if(type === "prefab"){
        return schema.defaultPrefabAssetJSON;
    }
    else{
        return schema.defaultOtherAssetJSON;
    }
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);
function isImageFile(filePath: string){
    const ext = path.extname(filePath).toLowerCase();
    return IMAGE_EXTS.has(ext);
}
function isGLBFile(filePath: string){
    const ext = path.extname(filePath).toLowerCase();
    return ext === ".glb";
}

const ASSET_GENERATED_DIR = path.join(process.cwd(), ".assets");
async function genAssetWithFile(fileRow: FileRow, assetRow: AssetRow, type: AssetRow["type"]) {
    if(!fileRow.path) return;
    if(type === "image"){
        const raw = await imageToRaw(fs.readFileSync(fileRow.path));
        const imageAsset: ShotEngineType.ImageAsset = {
            width: raw.info.width,
            height: raw.info.height,
            data: raw.data
        }
        genImageAsset(assetRow, imageAsset);
    }
    else genDefaultAsset(fileRow, assetRow);
}
function genDefaultAsset(fileRow: FileRow, assetRow: AssetRow){
    fs.ensureDirSync(ASSET_GENERATED_DIR);
    const genAssetPath = path.join(ASSET_GENERATED_DIR, assetRow.uuid);
    const file = fs.openSync(genAssetPath, "w");
    fs.writeSync(file, `
        ${new Date().toLocaleTimeString()} \r\n todo: content of file ${fileRow.path}
        ${assetRow.type} ${assetRow.name}
    `);
    fs.closeSync(file);
}
function genImageAsset(assetRow: AssetRow, imageAsset: ShotEngineType.ImageAsset){
    fs.ensureDirSync(ASSET_GENERATED_DIR);
    const genAssetPath = path.join(ASSET_GENERATED_DIR, assetRow.uuid);
    saveImageAssetBinary(imageAsset, genAssetPath);
}
function genMeshAsset(assetRow: AssetRow, meshAsset: ShotEngineType.MeshAsset){
    fs.ensureDirSync(ASSET_GENERATED_DIR);
    const genAssetPath = path.join(ASSET_GENERATED_DIR, assetRow.uuid);
    saveMeshAssetBinary(meshAsset, genAssetPath);
}
function deleteGenAsset(uuid: string){
    const genAssetPath = path.join(ASSET_GENERATED_DIR, uuid);
    fs.removeSync(genAssetPath);
}

rescan();

import watcher from "@parcel/watcher";
import path from "node:path";
import fs from "fs-extra";
import z, { file } from "zod";
import * as schema from "./schema";

console.log("hello w");
const MAIN_DIR = path.join(process.cwd(), "test");
const SNAPSHOT_PATH = path.join(process.cwd(), "snapshot.txt");
async function watch(){
    const events = await watcher.getEventsSince(MAIN_DIR, SNAPSHOT_PATH);
    console.log(events);
    for(const event of events){
        onEvent(event.path);
    }

    const sub = await watcher.subscribe(MAIN_DIR, (err, events) => {
        if(err){
            console.log(err);
            return;
        }
        console.log(events);
        for(const event of events){
            onEvent(event.path);
        }
    });
    console.log("listen:", MAIN_DIR);
}
function onEvent(filePath: string){
    if(!isMetaFile(filePath)){
        ensureMetaFile(filePath);
    }
    else{
        ensureMetaFile(getSoureFilePath(filePath));
    }
}
function isMetaFile(filePath: string){
    const ext = path.extname(filePath);
    return (ext === ".meta");
}
function getMetaPath(filePath: string){
    return `${filePath}.meta`;
}
function isDirectoryFile(filePath: string){
    try{
        return fs.statSync(filePath).isDirectory();
    }
    catch(err){
        return false;
    }
}
function isImageFile(filePath: string){
    const ext = path.extname(filePath).toLowerCase();
    return (ext === ".png" || ext === ".jpg");
}
function ensureMetaFile(filePath: string){
    const metaFilePath = getMetaPath(filePath);
    if(!fs.existsSync(filePath)){
        fs.rmSync(metaFilePath, { force: true });
        return;
    }
    if(!fs.existsSync(metaFilePath)){
        fs.ensureFileSync(metaFilePath);
        if(isDirectoryFile(filePath)){
            fs.writeJsonSync(metaFilePath, schema.createDefaultFolder());
        }
        else if(isImageFile(filePath)){
            fs.writeJsonSync(metaFilePath, schema.createDefaultImage());
        }
        else{
            fs.writeJsonSync(metaFilePath, schema.createDefaultFile());
        }   
    }
    else{
        const metaContent = fs.readJsonSync(metaFilePath);
        if(isDirectoryFile(filePath)){
            if(!z.safeParse(schema.FolderSchema, metaContent).success){
                fs.writeJsonSync(metaFilePath, schema.createDefaultFolder());
            }
        }
        else if(isImageFile(filePath)){
            if(!z.safeParse(schema.ImageSchema, metaContent).success){
                fs.writeJsonSync(metaFilePath, schema.createDefaultImage());
            }
        }
        else{
            if(!z.safeParse(schema.FileSchema, metaContent).success){
                fs.writeJsonSync(metaFilePath, schema.createDefaultFile());
            }
        }
    }
}
function getSoureFilePath(metaFilePath: string){
    return metaFilePath.replace(".meta", "");
}

watch();

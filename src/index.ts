// import watcher from "@parcel/watcher";
// import path from "node:path";
// import fs from "fs-extra";
// import z from "zod";
// import * as schema from "./schema";
// import { debounce } from "lodash";

// console.log("hello w");
// const MAIN_DIR = path.join(process.cwd(), "test");
// const SNAPSHOT_PATH = path.join(process.cwd(), "snapshot.txt");
// async function watch(){
//     const { addEvents } = processEvents();

//     const events = await watcher.getEventsSince(MAIN_DIR, SNAPSHOT_PATH);
//     addEvents(events);

//     const sub = await watcher.subscribe(MAIN_DIR, (err, events) => {
//         if(err){
//             console.log(err);
//             return;
//         }
//         events.forEach(e => (e as any).time = performance.now());
//         addEvents(events);
//     });
//     console.log("listen:", MAIN_DIR);
// }
// function processEvents(){
//     let currentEvents: watcher.Event[] = [];
//     const debounceEvents = debounce(() => {
//         console.log(currentEvents);
//         if(currentEvents.some(event => !isStable(event.path))) return;
//         for(const event of currentEvents){
//             onEvent(event.path);
//         }
//         currentEvents = [];
//     }, 500);

//     return {
//         addEvents: (events: watcher.Event[]) => {
//             currentEvents.push(...events);
//             debounceEvents();
//         }
//     };
// }
// function isStable(filePath: string){
//     try{
//         if(!fs.existsSync(filePath)) return true;
//         const file = fs.openSync(filePath, "r");
//         fs.closeSync(file);
//         return true;
//     }
//     catch(err){
//         return false;
//     }
// }
// function onEvent(filePath: string){
//     console.log("process: ", filePath);
//     if(!isMetaFile(filePath)){
//         ensureMetaFile(filePath);
//     }
//     else{
//         ensureMetaFile(getSoureFilePath(filePath));
//     }
// }
// function isMetaFile(filePath: string){
//     const ext = path.extname(filePath);
//     return (ext === ".meta");
// }
// function getMetaPath(filePath: string){
//     return `${filePath}.meta`;
// }
// function isDirectoryFile(filePath: string){
//     try{
//         return fs.statSync(filePath).isDirectory();
//     }
//     catch(err){
//         return false;
//     }
// }
// function isImageFile(filePath: string){
//     const ext = path.extname(filePath).toLowerCase();
//     return (ext === ".png" || ext === ".jpg");
// }
// function ensureMetaFile(filePath: string){
//     const metaFilePath = getMetaPath(filePath);
//     if(!fs.existsSync(filePath)){
//         try{
//             fs.rmSync(metaFilePath, { force: true });
//         }
//         catch(err){
//             ensureMetaFile(filePath);
//         }
//         return;
//     }
//     if(!fs.existsSync(metaFilePath)){
//         fs.ensureFileSync(metaFilePath);
//         if(isDirectoryFile(filePath)){
//             fs.writeJsonSync(metaFilePath, schema.createDefaultFolder());
//         }
//         else if(isImageFile(filePath)){
//             fs.writeJsonSync(metaFilePath, schema.createDefaultImage());
//         }
//         else{
//             fs.writeJsonSync(metaFilePath, schema.createDefaultFile());
//         }   
//     }
//     else{
//         const metaContent = fs.readJsonSync(metaFilePath);
//         if(isDirectoryFile(filePath)){
//             if(!z.safeParse(schema.FolderSchema, metaContent).success){
//                 fs.writeJsonSync(metaFilePath, schema.createDefaultFolder());
//             }
//         }
//         else if(isImageFile(filePath)){
//             if(!z.safeParse(schema.ImageSchema, metaContent).success){
//                 fs.writeJsonSync(metaFilePath, schema.createDefaultImage());
//             }
//         }
//         else{
//             if(!z.safeParse(schema.FileSchema, metaContent).success){
//                 fs.writeJsonSync(metaFilePath, schema.createDefaultFile());
//             }
//         }
//     }
// }
// function getSoureFilePath(metaFilePath: string){
//     return metaFilePath.replace(".meta", "");
// }

// watch();

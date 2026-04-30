import sharp from "sharp";

export async function imageToRaw(image: Uint8Array){
    return await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
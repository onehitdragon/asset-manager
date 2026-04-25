import z from "zod";
import { v4 as uuidv4 } from 'uuid';

// folder
export const FolderSchema = z.object({
    guid: z.string(),
    type: z.literal("folder")
});

// file
export const FileSchema = z.object({
    guid: z.string(),
    type: z.literal("file")
});

// image
const WrapMode = z.enum(["REPEAT", "MIRROR", "CLAMP"]);
const FilterMode = z.enum(["NONE", "BILINEAR", "TRILINEAR"]);
const TextureBaseSchema = z.object({
    wrapMode: WrapMode,
    filterMode: FilterMode,
    generateMipmaps: z.boolean(),
});
const TextureSchema = TextureBaseSchema.extend({
    imageType: z.literal("Texture"),
    sRGB: z.boolean(),
    qualityLevel: z.number()
});
const NormalMapSchema = TextureBaseSchema.extend({
    imageType: z.literal("NormalMap"),
});
const LightMapSchema = TextureBaseSchema.extend({
    imageType: z.literal("LightMap"),
});
export const ImageSchema = z.object({
    guid: z.string(),
    type: z.literal("image"),
    property: z.discriminatedUnion("imageType", [
        TextureSchema,
        NormalMapSchema,
        LightMapSchema,
    ])
});

// asset
export const AssetSchema = z.discriminatedUnion("type", [FolderSchema, FileSchema, ImageSchema]);

// create utils
export function createDefaultFolder(){
    const newMetaObject: z.infer<typeof FolderSchema> = {
        guid: uuidv4(),
        type: "folder"
    };
    return newMetaObject;
}
export function createDefaultFile(){
    const newMetaObject: z.infer<typeof FileSchema> = {
        guid: uuidv4(),
        type: "file"
    };
    return newMetaObject;
}
export function createDefaultImage(){
    const newMetaObject: z.infer<typeof ImageSchema> = {
        guid: uuidv4(),
        type: "image",
        property: {
            imageType: "Texture",
            sRGB: true,
            qualityLevel: 255,
            generateMipmaps: true,
            wrapMode: "REPEAT",
            filterMode: "BILINEAR",
        }
    };
    return newMetaObject;
}

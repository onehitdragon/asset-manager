import z from "zod";
import { v4 as uuidv4 } from 'uuid';

// other
export const OtherSchema = z.object({
    type: z.literal("other")
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
    type: z.literal("image"),
    property: z.discriminatedUnion("imageType", [
        TextureSchema,
        NormalMapSchema,
        LightMapSchema,
    ])
});

// asset
export const AssetSchema = z.discriminatedUnion("type", [OtherSchema, ImageSchema]);

// types
export type OtherAsset = z.infer<typeof OtherSchema>;
export type ImageAsset = z.infer<typeof ImageSchema>;
export type MeshAsset = { type: "mesh" };
export type PrefabAsset = { type: "prefab" };
export type Asset = OtherAsset | ImageAsset | MeshAsset;

// defaults
export const defaultOtherAsset: OtherAsset = {
    type: "other"
}
export const defaultImageAsset: ImageAsset = {
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
export const defaultMeshAsset: MeshAsset = {
    type: "mesh"
};
export const defaultPrefabAsset: PrefabAsset = {
    type: "prefab"
};
export const defaultOtherAssetJSON = JSON.stringify(defaultOtherAsset);
export const defaultImageAssetJSON = JSON.stringify(defaultImageAsset);
export const defaultMeshAssetJSON = JSON.stringify(defaultMeshAsset);
export const defaultPrefabAssetJSON = JSON.stringify(defaultPrefabAsset);

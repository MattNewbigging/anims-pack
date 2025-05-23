import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

export enum AnimationAsset {
  Sprint = "A_Sprint_F_Masc.fbx",
  JumpStart = "jump_start.fbx",
  JumpLoop = "jump_loop.fbx",
  JumpEnd = "jump_end.fbx",
  Slide = "A_Sprint_ToCrouch_Masc.fbx",
}

export enum ModelAsset {
  DummyCharacter = "PolygonSyntyCharacter.fbx",
}

export enum TextureAsset {
  Dummy = "T_Polygon_Dummy_01.png",
  HDR = "orchard_cartoony.hdr",
}

export class AssetManager {
  private models = new Map<ModelAsset, THREE.Group>();
  textures = new Map<TextureAsset, THREE.Texture>();
  animations = new Map<AnimationAsset, THREE.AnimationClip>();

  private loadingManager = new THREE.LoadingManager();
  private fbxLoader = new FBXLoader(this.loadingManager);
  private gltfLoader = new GLTFLoader(this.loadingManager);
  private rgbeLoader = new RGBELoader(this.loadingManager);
  private textureLoader = new THREE.TextureLoader(this.loadingManager);

  applyModelTexture(model: THREE.Object3D, textureName: TextureAsset) {
    const texture = this.textures.get(textureName);
    if (!texture) {
      return;
    }

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshLambertMaterial;
        material.map = texture;
        material.vertexColors = false;
      }
    });
  }

  getModel(name: ModelAsset): THREE.Object3D {
    const model = this.models.get(name);
    if (model) {
      return SkeletonUtils.clone(model);
    }

    console.error(name + " model not found");
    // Ensure we always return an object 3d
    return new THREE.Mesh(
      new THREE.SphereGeometry(),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
  }

  load(): Promise<void> {
    this.loadModels();
    this.loadTextures();
    this.loadAnimations();

    this.loadingManager.onError = (error) =>
      console.error("Loading error", error);

    return new Promise((resolve) => {
      this.loadingManager.onLoad = () => {
        resolve();
      };
    });
  }

  private loadModels() {
    this.loadModel(ModelAsset.DummyCharacter);
  }

  private loadTextures() {
    this.loadTexture(
      TextureAsset.Dummy,
      (texture) => (texture.colorSpace = THREE.SRGBColorSpace)
    );

    this.loadTexture(
      TextureAsset.HDR,
      (texture) => (texture.mapping = THREE.EquirectangularReflectionMapping)
    );
  }

  private loadAnimations() {
    Object.values(AnimationAsset).forEach((filename) =>
      this.loadAnimation(filename)
    );
  }

  private loadModel(
    filename: ModelAsset,
    onLoad?: (group: THREE.Group) => void
  ) {
    const path = `${getPathPrefix()}/models/${filename}`;
    const url = getUrl(path);

    const filetype = filename.split(".")[1];

    // FBX
    if (filetype === "fbx") {
      this.fbxLoader.load(url, (group: THREE.Group) => {
        onLoad?.(group);
        this.models.set(filename, group);
      });

      return;
    }

    // GLTF
    this.gltfLoader.load(url, (gltf: GLTF) => {
      onLoad?.(gltf.scene);
      this.models.set(filename, gltf.scene);
    });
  }

  private loadTexture(
    filename: TextureAsset,
    onLoad?: (texture: THREE.Texture) => void
  ) {
    const path = `${getPathPrefix()}/textures/${filename}`;
    const url = getUrl(path);

    const filetype = filename.split(".")[1];
    const loader = filetype === "png" ? this.textureLoader : this.rgbeLoader;

    loader.load(url, (texture) => {
      onLoad?.(texture);
      this.textures.set(filename, texture);
    });
  }

  private loadAnimation(filename: AnimationAsset) {
    const path = `${getPathPrefix()}/anims/${filename}`;
    console.log("loading", filename);
    const url = getUrl(path);

    this.fbxLoader.load(url, (group) => {
      if (group.animations.length) {
        const clip = group.animations[0];
        clip.name = filename;
        this.animations.set(filename, clip);
      }
    });
  }
}

function getPathPrefix() {
  // Using template strings to create url paths breaks on github pages
  // We need to manually add the required /repo/ prefix to the path if not on localhost
  return location.hostname === "localhost" ? "" : "/anims-pack";
}

function getUrl(path: string) {
  return new URL(path, import.meta.url).href;
}

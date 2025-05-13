import * as THREE from "three";
import {
  AnimationAsset,
  AssetManager,
  ModelAsset,
  TextureAsset,
} from "./asset-manager";

// Main animation states
export type AnimationState = "idle" | "run";

// Names of all animations, including transitions between main states
export type AnimationName = "idle" | "idleToRun" | "run" | "sprint";

export class Character extends THREE.Object3D {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<AnimationName, THREE.AnimationAction>();

  private currentState: AnimationState;
  private currentAction: THREE.AnimationAction;
  private currentActionName: AnimationName;

  private actionQueue: AnimationName[] = [];

  constructor(private assetManager: AssetManager) {
    super();

    // Setup mesh
    const mesh = assetManager.getModel(ModelAsset.DummyCharacter);
    assetManager.applyModelTexture(mesh, TextureAsset.Dummy);

    this.add(mesh);

    // Animations
    this.mixer = new THREE.AnimationMixer(mesh);
    this.setupAnimations();
    this.mixer.addEventListener("finished", this.onAnimationFinish);

    // Scale
    this.scale.multiplyScalar(0.01);

    // Default to idle
    this.currentState = "run";
    this.currentActionName = "sprint";
    this.currentAction = this.actions.get("sprint")!;
    this.currentAction.play();
  }

  changeAnimationState(newState: AnimationState) {
    if (this.currentState === newState) return; // already there

    // Find the right transition to get to this state
    // TODO neaten this up later

    if (this.currentState === "idle" && newState === "run") {
      // Need to first play transition, then run when transition ends
      this.queueAnimations("idleToRun", "run");
    }
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  private queueAnimations(...names: AnimationName[]) {
    names.forEach((name) => this.actionQueue.push(name));
  }

  private playAnimation(name: AnimationName) {
    // Find the new action with the given name
    const nextAction = this.actions.get(name);
    if (!nextAction) {
      throw Error(
        "Could not find action with name " + name + "for character " + this
      );
    }

    // Reset the next action then fade to it from the current action
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

    this.currentAction
      ? nextAction.crossFadeFrom(this.currentAction, 0.25, false).play()
      : nextAction.play();

    // Next is now current
    this.currentAction = nextAction;
    this.currentActionName = name;
  }

  private onAnimationFinish = (event: { action: THREE.AnimationAction }) => {
    // Check if there is anything else in the queue to play now
  };

  private setupAnimations() {
    const { animations } = this.assetManager;

    const idleClip = animations.get(AnimationAsset.Idle)!;
    idleClip.name = "idle";
    const idleAction = this.mixer.clipAction(idleClip);
    this.actions.set("idle", idleAction);

    const idleToRunClip = animations.get(AnimationAsset.IdleToRun)!;
    idleToRunClip.name = "idleToRun";
    const idleToRunAction = this.mixer.clipAction(idleToRunClip);
    this.actions.set("idleToRun", idleToRunAction);

    const runClip = animations.get(AnimationAsset.Run)!;
    runClip.name = "run";
    const runAction = this.mixer.clipAction(runClip);
    this.actions.set("run", runAction);

    const sprintClip = animations.get(AnimationAsset.Sprint)!;
    sprintClip.name = "sprint";
    const sprintAction = this.mixer.clipAction(sprintClip);
    this.actions.set("sprint", sprintAction);
  }
}

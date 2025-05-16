import * as THREE from "three";
import {
  AnimationAsset,
  AssetManager,
  ModelAsset,
  TextureAsset,
} from "./asset-manager";

// Main animation states
export type AnimationState = "idle" | "run" | "jump";

// Names of all animations, including transitions between main states
export type AnimationName =
  | "sprint"
  | "jumpStart"
  | "jumpLoop"
  | "jumpEnd"
  | "slide";

export class Character extends THREE.Object3D {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<AnimationName, THREE.AnimationAction>();

  private currentState: AnimationState;
  private currentAction: THREE.AnimationAction;

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

    // Default to sprint
    this.currentState = "run";
    this.currentAction = this.actions.get("sprint")!;
    this.currentAction.play();
  }

  changeAnimationState(newState: AnimationState) {
    if (this.currentState === newState) return; // already there

    switch (newState) {
      case "run":
        this.currentState = "run";
        this.playAnimation("sprint");
        break;
      case "jump":
        if (this.currentState === "run") {
          this.currentState = "jump";
          this.playAnimation("jumpStart");
        }
        break;
    }
  }

  update(dt: number) {
    this.mixer.update(dt);
  }

  playAnimation(name: AnimationName) {
    // Find the new action with the given name
    const nextAction = this.actions.get(name);
    if (!nextAction) {
      throw Error(
        "Could not find action with name " + name + "for character " + this
      );
    }

    // Reset the next action
    nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

    if (name === "sprint") {
      this.currentAction.stop();
      nextAction.play();
    } else {
      nextAction.crossFadeFrom(this.currentAction, 0.25, false).play();
    }

    // if (name === "jumpStart" || name === "jumpEnd") {
    //   nextAction.crossFadeFrom(this.currentAction, 0.25, false).play();
    // } else {
    //   this.currentAction.stop();
    //   nextAction.play();
    // }

    // this.currentAction
    //   ? nextAction.crossFadeFrom(this.currentAction, 0, false).play()
    //   : nextAction.play();

    // Next is now current
    this.currentAction = nextAction;
  }

  private onAnimationFinish = (event: { action: THREE.AnimationAction }) => {
    const actionName = event.action.getClip().name as AnimationName;

    console.log("finished: ", actionName);

    switch (actionName) {
      case "jumpStart":
        this.playAnimation("jumpLoop");
        break;
      case "jumpEnd":
        this.playAnimation("sprint");
        break;
    }
  };

  private setupAnimations() {
    const { animations } = this.assetManager;

    const sprintClip = animations.get(AnimationAsset.Sprint)!;
    sprintClip.name = "sprint";
    const sprintAction = this.mixer.clipAction(sprintClip);
    this.actions.set("sprint", sprintAction);

    const jumpStartClip = animations.get(AnimationAsset.JumpStart)!;
    jumpStartClip.name = "jumpStart";
    const jumpStartAction = this.mixer.clipAction(jumpStartClip);
    jumpStartAction.setLoop(THREE.LoopOnce, 1);
    jumpStartAction.clampWhenFinished = true;
    this.actions.set("jumpStart", jumpStartAction);

    const jumpLoopClip = animations.get(AnimationAsset.JumpLoop)!;
    jumpLoopClip.name = "jumpLoop";
    const jumpLoopAction = this.mixer.clipAction(jumpLoopClip);
    jumpLoopAction.setLoop(THREE.LoopRepeat, Infinity);
    this.actions.set("jumpLoop", jumpLoopAction);

    const jumpEndClip = animations.get(AnimationAsset.JumpEnd)!;
    jumpEndClip.name = "jumpEnd";
    const jumpEndAction = this.mixer.clipAction(jumpEndClip);
    jumpEndAction.setLoop(THREE.LoopOnce, 1);
    this.actions.set("jumpEnd", jumpEndAction);

    const slideClip = animations.get(AnimationAsset.Slide)!;
    slideClip.name = "slide";
    const slideAction = this.mixer.clipAction(slideClip);
    this.actions.set("slide", slideAction);
  }
}

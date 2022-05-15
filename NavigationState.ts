export class NavigationState {
  /**
   * Current screens group. Defaults to `main`
   */
  group: string;

  /**
   * Total number of opened screens. Defaults to `1` -- starting screen
   */
  screens: number;

  constructor(init: Partial<NavigationState>) {
    Object.assign(this, init);
  }

  /**
   * Transition to next navigation state by producing a new state
   */
  transitionTo(nextStateInit: Partial<NavigationState & { replace: boolean }>): NavigationState {
    const nextGroup = nextStateInit.group ?? this.group;
    const nextScreens = nextGroup === this.group
      ? this.screens + Number(!nextStateInit.replace)
      // Reset screens count while transitioning between screens groups
      : 1;

    return new NavigationState({
      group: nextGroup,
      screens: nextScreens,
    });
  }
}

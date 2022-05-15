interface PushOptions {
  replace?: boolean;
  screens_group?: string;
}

type Param = 'screens_group' | 'opened_screens';
type ValueTransformer<T> = (value: string) => T;

const identityFn: ValueTransformer<any> = value => value;

const NativeSearchParams = typeof URLSearchParams !== 'undefined'
  ? URLSearchParams
  // Fallback to `Map` class when no `URLSearchParams`
  // is available, like in Node.js
  : Map;

/**
 * Helper class
 */
class Webkit2SearchParams extends NativeSearchParams {
  static PARAM_PREFIX = 'webkit2';

  get<T = string>(
    param: Param,
    defaultValue?: string,
    transformer: ValueTransformer<T> = identityFn,
  ): T {
    return transformer(super.get(`${Webkit2SearchParams.PARAM_PREFIX}_${param}`) || defaultValue);
  }

  set(param: Param, value: any) {
    return super.set(param, String(value));
  }
}

class NavigationState {
  /**
   * Current screens group. Defaults to `main`
   */
  group: string;

  /**
   * Total number of opened screens. Defaults to `1` -- starting screen
   */
  screens: number;

  /**
   *
   */
  static fromWebkit2Params(params: Webkit2SearchParams) {
    return new NavigationState({
      group: params.get('screens_group', 'main'),
      screens: params.get('opened_screens', '1', Number),
    });
  }

  constructor(init: Partial<NavigationState>) {
    Object.assign(this, init);
  }

  /**
   * Transition to next navigation state by producing a new state
   */
  transitionTo(nextStateInit: Partial<NavigationState> & { replace?: boolean }): NavigationState {
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

class Navigation extends Object {
  /**
   * Helpers
   */
  private _history = window.history;
  private _location = window.location;

  /**
   * Current navigation state
   */
  private _state = NavigationState.fromWebkit2Params(
    new Webkit2SearchParams(this._location.search),
  );

  /**
   * Flag for DEV mode
   */
  private __inDev = this._location.hostname.startsWith('dev.');

  async reload(): Promise<string> {
    this._location.reload();
    return '';
  }

  async push(deeplink: string, options: PushOptions = {}): Promise<string> {
    const parsedDeeplink = new URL(deeplink);
    const sniffedURL = parsedDeeplink.searchParams.get('url');
    const targetURL = sniffedURL ? new URL(sniffedURL) : parsedDeeplink;

    if (sniffedURL) {
      if (this.__inDev) {
        // Rewrite host pointing to self location
        targetURL.host = this._location.host;
      }

      const nextParams = new Webkit2SearchParams(targetURL.searchParams);
      const nextState = this._state.transitionTo({
        group: options.screens_group,
        replace: options.replace,
      });

      nextParams.set('screens_group', nextState.group);
      nextParams.set('opened_screens', nextState.screens);

      // Update with new params
      targetURL.search = nextParams.toString();
    }

    this._location[options.replace ? 'replace' : 'assign'](targetURL);
    return targetURL.toString();
  }

  async pop(args: { screens?: number } = {}): Promise<string> {
    const screens = args.screens ?? 1;

    this._history.go(-screens);
    return '';
  }

  async openForResult(deeplink: string): Promise<any> {
    await this.push(deeplink);
    return null;
  }

  async closeScreenGroup(): Promise<string> {
    await this.pop({ screens: this._state.screens });
    return '';
  }
}
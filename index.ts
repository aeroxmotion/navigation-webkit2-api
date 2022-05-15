interface PushOptions {
  replace?: boolean;
  screens_group?: string;
}

type Param = 'group' | 'screens';
type ValueTransformer<T> = (value: string) => T;

const identityFn: ValueTransformer<any> = value => value;

const NativeSearchParams = typeof URLSearchParams !== 'undefined'
  ? URLSearchParams
  // Fallback to `Map` class when no `URLSearchParams`
  // is available - like in Node.js
  : Map;

/**
 * Helper class
 */
class Webkit2SearchParams extends NativeSearchParams {
  static PARAM_PREFIX = '__webkit2__';

  get<T = string>(
    param: Param,
    defaultValue?: string,
    transformer: ValueTransformer<T> = identityFn,
  ): T {
    return transformer(super.get(Webkit2SearchParams.PARAM_PREFIX + param) || defaultValue);
  }

  set(param: Param, value: any) {
    super.set(param, String(value));
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

class Navigation {
  /**
   * Helpers
   */
  private _history = window.history;
  private _location = window.location;

  /**
   * Flag for DEV mode
   */
  private __inDev = this._location.hostname.startsWith('dev.');

  /**
   * Current navigation state
   */
  private _state: NavigationState = (() => {
    const params = new Webkit2SearchParams(this._location.search);

    return new NavigationState({
      group: params.get('group', 'main'),
      screens: params.get('screens', '1', Number),
    });
  })();

  async reload(): Promise<string> {
    this._location.reload();
    return '';
  }

  async push(deeplink: string, options: PushOptions = {}): Promise<string> {
    const parsedDeeplink = new URL(deeplink);
    const sniffedURL = parsedDeeplink.searchParams.get('url');
    const targetURL = sniffedURL ? new URL(sniffedURL) : parsedDeeplink;

    if (!sniffedURL) {
      debugPossibleUnhandledURL(targetURL);
    } else {
      const nextParams = new Webkit2SearchParams(targetURL.searchParams);
      const nextState = this._state.transitionTo({
        group: options.screens_group,
        replace: options.replace,
      });

      nextParams.set('group', nextState.group);
      nextParams.set('screens', nextState.screens);

      // Update with new params
      targetURL.search = nextParams.toString();

      if (this.__inDev) {
        // Rewrite host pointing to self location
        targetURL.host = this._location.host;
      }
    }

    // Try to perform navigation
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

function debugPossibleUnhandledURL(url: URL) {
  const params = [...url.searchParams.entries()];

  console.warn(`Possible unhandled URL: ${url.origin + url.pathname}

  --- Query Params ---
  ${params.length
    ? params
        .map(([key, value]) => `${key}: ${value}`)
        .join(`\n  `)
    : 'No query params found...'}

  --- Full URL ---
  ${url.toString()}`);
}

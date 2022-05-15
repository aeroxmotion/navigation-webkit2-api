import { Webkit2SearchParams } from './Webkit2SearchParams'
import { NavigationState } from './NavigationState'
import { generateRandomGroupID, debugPossibleUnhandledURL } from './utils'

interface PushOptions {
  replace?: boolean;
  screens_group?: string;
}

interface PushWebOptions {
  __web?: {
    rewriteHostDev?: boolean;
  };
}

export class Navigation {
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

  async push(deeplink: string, options: PushOptions & PushWebOptions = {}): Promise<string> {
    const parsedDeeplink = new URL(deeplink);
    const sniffedURL = parsedDeeplink.searchParams.get('url');
    const targetURL = sniffedURL ? new URL(sniffedURL) : parsedDeeplink;

    if (sniffedURL) {
      const nextParams = new Webkit2SearchParams(targetURL.searchParams);
      const nextState = this._state.transitionTo({
        group: options.screens_group,
        replace: options.replace,
      });

      nextParams.set('group', nextState.group);
      nextParams.set('screens', nextState.screens);

      // Update with new params
      targetURL.search = nextParams.toString();

      if (this.__inDev && options.__web?.rewriteHostDev !== false) {
        // Rewrite host pointing to self location
        targetURL.host = this._location.host;
      }
    }

    if (!targetURL.protocol.startsWith('http')) {
      debugPossibleUnhandledURL(deeplink, targetURL);
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
    // Generate a random `GROUP_ID` to reset opened `screens`
    const randomGroup = generateRandomGroupID();

    await this.push(deeplink, {
      screens_group: randomGroup,
      __web: {
        rewriteHostDev: false,
      },
    });

    return null;
  }

  async closeScreenGroup(): Promise<string> {
    await this.pop({ screens: this._state.screens });
    return '';
  }
}

import { Webkit2SearchParams } from './Webkit2SearchParams'
import { NavigationState } from './NavigationState'
import { getTargetURL } from './utils'
import { NavigationGroup } from './NavigationGroup';

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
   * Current navigation state
   */
  private _state: NavigationState = (() => {
    const params = new Webkit2SearchParams(this._location.search);

    return new NavigationState({
      group: params.get('group', 'main'),
      screens: params.get('screens', '1', Number),
    });
  })();

  /**
   * Active navigation group
   */
  private _group = new NavigationGroup(this._state.group);

  async reload(): Promise<string> {
    this._location.reload();
    return '';
  }

  async push(deeplink: string, options: PushOptions & PushWebOptions = {}): Promise<string> {
    const targetURL = getTargetURL(deeplink, options.__web?.rewriteHostDev);
    const nextParams = new Webkit2SearchParams(targetURL.searchParams);
    const nextState = this._state.transitionTo({
      group: options.screens_group,
      replace: options.replace,
    });

    nextParams.set('group', nextState.group);
    nextParams.set('screens', nextState.screens);

    // Update with new params
    targetURL.search = nextParams.toString();

    // Try to perform navigation
    this._location[options.replace ? 'replace' : 'assign'](targetURL);
    return targetURL.toString();
  }

  async pop(args: { screens?: number } = {}): Promise<string> {
    const screens = args.screens ?? 1;

    this._history.go(-screens);
    return '';
  }

  openForResult(deeplink: string): Promise<any> {
    const resultPromise = NavigationGroup.spawn(deeplink);
    return resultPromise;
  }

  // TODO(cacastelmeli): implement this
  canOpenDeeplink() {
    return true;
  }

  async openLinkInAppBrowser(url: string): Promise<string> {
    window.open(url, '_blank');
    return '';
  }

  opneLinkOutsideApp(url: string): Promise<string> {
    return this.openLinkInAppBrowser(url);
  }

  async closeScreenGroup(args: { result?: any } = {}): Promise<string> {
    return this._group.close(args.result);
  }

  getStoreGroup(selector?: string): Promise<any> {
    const store = this._group.getStore();
    return selector ? store[selector] : store;
  }

  setStoreGroup(nextStoreProducer: (store: any) => any, selector?: string) {
    const store = this._group.getStore();
    const nextStore = nextStoreProducer(selector != null ? store[selector] : store);

    return this._group.setStore(
      selector != null
        ? { ...store, [selector]: nextStore }
        : nextStore,
    );
  }
}

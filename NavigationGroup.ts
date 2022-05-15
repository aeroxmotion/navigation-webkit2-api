import { generateRandomGroupID, getTargetURL } from './utils';
import { Webkit2SearchParams } from './Webkit2SearchParams';


export class NavigationGroup {
  static NON_CACHED_STORE = {};
  static RESULT_KEY_PREFIX = '__webkit2__result__';
  static STORAGE_KEY_PREFIX = '__webkit2__storage__';

  static resultKey(group: string) {
    return NavigationGroup.RESULT_KEY_PREFIX + group;
  }

  static spawn(deeplink: string): Promise<any> {
    const targetURL = getTargetURL(deeplink, false);
    const params = new Webkit2SearchParams(targetURL.searchParams);
    const nextGroup = generateRandomGroupID();

    params.set('group', nextGroup);
    targetURL.search = params.toString();

    const targetWindow = window.open(targetURL, '_blank');
    const resultkey = NavigationGroup.resultKey(nextGroup);

    return new Promise((resolve, reject) => {
      const onMessage = ({ data }: MessageEvent) => {
        if (
          typeof data === 'object' && data !== null &&
          data.hasOwnProperty(resultkey)
        ) {
          resolve(data[resultkey]);
          clearListeners();
        }
      };

      const onPageHide = () => {
        reject(new Error('[openForResult] tab closed'));
        clearListeners();
      };

      const clearListeners = () => {
        targetWindow.removeEventListener('message', onMessage);
        targetWindow.removeEventListener('pagehide', onPageHide);
      };

      targetWindow.addEventListener('message', onMessage);
      targetWindow.addEventListener('pagehide', onPageHide);
    });
  }

  /**
   * Helpers
   */
  private _window = window;
  private _storage: Storage = this._window.sessionStorage;

  /**
   * Storage
   */
  private _storageKey = NavigationGroup.STORAGE_KEY_PREFIX;
  private _cachedStore: any = NavigationGroup.NON_CACHED_STORE;

  constructor(
    public group: string) {
    this._storageKey += `:${group}`;
  }

  close(result: any = null): Promise<string> {
    this._window.postMessage({
      [NavigationGroup.resultKey(this.group)]: result,
    });

    // Clear store on unload
    this._window.addEventListener('pagehide', () => {
      this._clearStore();
    });

    return new Promise((resolve) => {
      resolve('');

      // Close window after some ticks
      setTimeout(() => this._window.close(), 5);
    });
  }

  async getStore(): Promise<any> {
    if (this._cachedStore === NavigationGroup.NON_CACHED_STORE) {
      this._cachedStore = JSON.parse(this._storage.getItem(this._storageKey));
    }

    return this._cachedStore;
  }

  async setStore(nextStore: any): Promise<string> {
    this._storage.setItem(this._storageKey, JSON.stringify(nextStore));
    this._cachedStore = NavigationGroup.NON_CACHED_STORE;

    return '';
  }

  private _clearStore(): void {
    this._storage.removeItem(this._storageKey);
    this._cachedStore = NavigationGroup.NON_CACHED_STORE;
  }
}

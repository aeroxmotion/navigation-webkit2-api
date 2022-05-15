import { generateRandomGroupID, getTargetURL } from './utils';
import { Webkit2SearchParams } from './Webkit2SearchParams';

export class NavigationGroup {
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
  private _groupStoragePrefix = NavigationGroup.STORAGE_KEY_PREFIX;

  constructor(
    public group: string) {
    this._groupStoragePrefix += `:${group}`;
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

  async getStore(selector?: string): Promise<any> {
    const store = JSON.parse(this._storage.getItem(this._storageKey(selector)) ?? '{}');
    return store;
  }

  async setStore(value: any, selector?: string): Promise<string> {
    this._storage.setItem(this._storageKey(selector), JSON.stringify(value));
    return '';
  }

  private _clearStore(): void {
    const keysToRemove: string[] = [];
    const { length } = this._storage;

    // 1. Collect keys to remove
    for (let i = 0; i < length; i++) {
      const key = this._storage.key(i);

      if (key.startsWith(this._groupStoragePrefix)) {
        keysToRemove.push(key);
      }
    }

    // 2. Remove keys
    for (const key of keysToRemove) {
      this._storage.removeItem(key);
    }
  }

  private _storageKey(selector = 'default') {
    return `${this._groupStoragePrefix}:${selector}`;
  }
}

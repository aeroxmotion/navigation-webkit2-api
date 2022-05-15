import { generateRandomGroupID, getTargetURL } from './utils';
import { Webkit2SearchParams } from './Webkit2SearchParams';

export class NavigationGroup {
  static RESULT_KEY_PREFIX = '__webkit2__result__';

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

      const onUnload = () => {
        reject(new Error('[openForResult] tab closed'));
        clearListeners();
      };

      const clearListeners = () => {
        targetWindow.removeEventListener('message', onMessage);
        targetWindow.removeEventListener('unload', onUnload);
      };

      targetWindow.addEventListener('message', onMessage);
      targetWindow.addEventListener('unload', onUnload);
    });
  }

  private _window = window;

  constructor(
    public group: string) {}

  close(result: any = null): Promise<string> {
    this._window.postMessage({
      [NavigationGroup.resultKey(this.group)]: result,
    });

    return new Promise((resolve) => {
      resolve('');

      // Close window after some ticks
      setTimeout(() => this._window.close(), 5);
    });
  }
}

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
export class Webkit2SearchParams extends NativeSearchParams {
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

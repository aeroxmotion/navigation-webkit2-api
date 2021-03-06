type Param = 'group' | 'screens';
type ValueTransformer<T> = (value: string) => T;

const identityFn: ValueTransformer<any> = value => value;

/**
 * Helper class
 */
export class Webkit2SearchParams extends URLSearchParams {
  static PARAM_PREFIX = '__webkit2__';

  static prefixParam(param: Param): string {
    return this.PARAM_PREFIX + param;
  }

  constructor(init?: string | { [K in Param]?: string } | URLSearchParams) {
    super(init);
  }

  get<T = string>(
    param: Param,
    defaultValue?: string,
    transformer: ValueTransformer<T> = identityFn,
  ): T {
    return transformer(super.get(Webkit2SearchParams.prefixParam(param)) || defaultValue);
  }

  set(param: Param, value: any) {
    super.set(Webkit2SearchParams.prefixParam(param), String(value));
  }
}

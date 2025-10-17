declare module 'next/headers' {
  interface ReadonlyHeaders {
    get(name: string): string | null;
  }

  type SameSiteOption = 'lax' | 'strict' | 'none';

  interface CookieValue {
    name: string;
    value: string;
  }

  interface CookieSetOptions {
    httpOnly?: boolean;
    sameSite?: SameSiteOption;
    secure?: boolean;
    maxAge?: number;
    path?: string;
  }

  interface RequestCookies {
    getAll(): CookieValue[];
    getAll(name: string): CookieValue[];
    get(name: string): CookieValue | undefined;
    set(name: string, value: string, options?: CookieSetOptions): void;
    set(options: CookieValue & CookieSetOptions): void;
    delete(name: string): void;
  }

  export function headers(): ReadonlyHeaders;
  export function cookies(): RequestCookies;
  export function __resetCookiesStore(): void;
}

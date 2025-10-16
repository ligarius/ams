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
    name: string;
    value: string;
    httpOnly?: boolean;
    sameSite?: SameSiteOption;
    secure?: boolean;
    maxAge?: number;
    path?: string;
  }

  interface RequestCookies {
    getAll(): CookieValue[];
    get(name: string): CookieValue | undefined;
    set(options: CookieSetOptions): void;
    delete(name: string): void;
  }

  export function headers(): ReadonlyHeaders;
  export function cookies(): RequestCookies;
}

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
    domain?: string;
    priority?: 'low' | 'medium' | 'high';
    expires?: Date;
  }

  type RequestCookie = CookieValue & CookieSetOptions;

  interface CookieDeleteOptions {
    name: string;
    path?: string;
    domain?: string;
  }

  type RequestCookie = CookieValue & CookieSetOptions;

  interface RequestCookies {
    getAll(): RequestCookie[];
    getAll(name: string): RequestCookie[];
    get(name: string): RequestCookie | undefined;
    set(name: string, value: string, options?: CookieSetOptions): void;
    set(options: RequestCookie): void;
    delete(name: string): void;
    delete(options: CookieDeleteOptions): void;
    has(name: string): boolean;
  }

  export function headers(): ReadonlyHeaders;
  export function cookies(): RequestCookies;
  export function __resetCookiesStore(): void;
}

declare module 'next/headers' {
  interface ReadonlyHeaders {
    get(name: string): string | null;
  }

  interface CookieValue {
    name: string;
    value: string;
  }

  interface RequestCookies {
    getAll(): CookieValue[];
  }

  export function headers(): ReadonlyHeaders;
  export function cookies(): RequestCookies;
}

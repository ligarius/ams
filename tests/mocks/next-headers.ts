interface CookieValue {
  name: string;
  value: string;
}

interface CookieSetOptions {
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  maxAge?: number;
  path?: string;
  domain?: string;
  priority?: 'low' | 'medium' | 'high';
  expires?: Date;
}

type CookieStoreEntry = CookieValue & CookieSetOptions;
type CookieSetInput = CookieStoreEntry;

const cookieStore: CookieStoreEntry[] = [];

const clone = ({ expires, ...rest }: CookieStoreEntry): CookieStoreEntry => ({
  ...rest,
  ...(expires ? { expires: new Date(expires) } : {}),
});

const prepareForStore = ({ expires, ...rest }: CookieStoreEntry): CookieStoreEntry => ({
  ...rest,
  ...(expires ? { expires: new Date(expires) } : {}),
});

const findCookieIndex = (name: string) => cookieStore.findIndex((cookie) => cookie.name === name);

const normaliseSetInput = (
  nameOrOptions: string | CookieSetInput,
  value?: string,
  options?: CookieSetOptions
): CookieStoreEntry => {
  if (typeof nameOrOptions === 'string') {
    if (typeof value !== 'string') {
      throw new TypeError('cookies().set requires a string value when called with a name');
    }

    return { name: nameOrOptions, value, ...(options ?? {}) };
  }

  const { name, value: resolvedValue, ...setOptions } = nameOrOptions;

  return { name, value: resolvedValue, ...setOptions };
};

export const headers = jest.fn(() => ({
  get: () => null,
}));

export const cookies = jest.fn(() => {
  const getAll = (name?: string) =>
    cookieStore.filter((cookie) => (name ? cookie.name === name : true)).map(clone);
  const get = (name: string) => {
    const entry = cookieStore.find((cookie) => cookie.name === name);
    return entry ? clone(entry) : undefined;
  };
  const set = (
    nameOrOptions: string | CookieSetInput,
    value?: string,
    options?: CookieSetOptions
  ) => {
    const normalised = normaliseSetInput(nameOrOptions, value, options);
    const index = findCookieIndex(normalised.name);
    const entry = prepareForStore(normalised);
    if (index === -1) {
      cookieStore.push(entry);
      return;
    }
    cookieStore[index] = entry;
  };
  const remove = (name: string) => {
    const index = findCookieIndex(name);
    if (index === -1) {
      return;
    }
    cookieStore.splice(index, 1);
  };
  const has = (name: string) => findCookieIndex(name) !== -1;

  return {
    getAll,
    get,
    set,
    delete: remove,
    has,
  };
});

export const __resetCookiesStore = () => {
  cookieStore.length = 0;
};

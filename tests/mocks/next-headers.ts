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

interface CookieDeleteOptions {
  name: string;
  path?: string;
  domain?: string;
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

const matchesIdentity = (
  entry: CookieStoreEntry,
  identity: CookieDeleteOptions
) =>
  entry.name === identity.name &&
  (identity.path === undefined || entry.path === identity.path) &&
  (identity.domain === undefined || entry.domain === identity.domain);

const findCookieIndex = (identity: CookieDeleteOptions) =>
  cookieStore.findIndex((cookie) => matchesIdentity(cookie, identity));

const resolveIdentity = (input: string | CookieDeleteOptions): CookieDeleteOptions =>
  typeof input === 'string' ? { name: input } : input;

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
    const identity = resolveIdentity(normalised);
    const entry = prepareForStore(normalised);
    const index = findCookieIndex(identity);
    if (index === -1) {
      cookieStore.push(entry);
      return;
    }
    cookieStore[index] = entry;
  };
  const remove = (nameOrOptions: string | CookieDeleteOptions) => {
    const identity = resolveIdentity(nameOrOptions);
    const index = findCookieIndex(identity);
    if (index === -1) {
      return;
    }
    cookieStore.splice(index, 1);
  };
  const has = (name: string) => cookieStore.some((cookie) => cookie.name === name);

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

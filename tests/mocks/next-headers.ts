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
}

type CookieSetInput = CookieValue & CookieSetOptions;

const cookieStore: CookieValue[] = [];

const clone = ({ name, value }: CookieValue): CookieValue => ({ name, value });

const findCookieIndex = (name: string) => cookieStore.findIndex((cookie) => cookie.name === name);

const normaliseSetInput = (
  nameOrOptions: string | CookieSetInput,
  value?: string,
  _options?: CookieSetOptions
): CookieValue => {
  if (typeof nameOrOptions === 'string') {
    if (typeof value !== 'string') {
      throw new TypeError('cookies().set requires a string value when called with a name');
    }

    return { name: nameOrOptions, value };
  }

  return { name: nameOrOptions.name, value: nameOrOptions.value };
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
    const { name, value: resolvedValue } = normaliseSetInput(nameOrOptions, value, options);
    const index = findCookieIndex(name);
    const newEntry = { name, value: resolvedValue };
    if (index === -1) {
      cookieStore.push(newEntry);
      return;
    }
    cookieStore[index] = newEntry;
  };
  const remove = (name: string) => {
    const index = findCookieIndex(name);
    if (index === -1) {
      return;
    }
    cookieStore.splice(index, 1);
  };

  return {
    getAll,
    get,
    set,
    delete: remove,
  };
});

export const __resetCookiesStore = () => {
  cookieStore.length = 0;
};

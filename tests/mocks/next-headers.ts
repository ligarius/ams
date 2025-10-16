interface CookieValue {
  name: string;
  value: string;
}

interface CookieSetOptions extends CookieValue {
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  maxAge?: number;
  path?: string;
}

const cookieStore: CookieValue[] = [];

const clone = ({ name, value }: CookieValue): CookieValue => ({ name, value });

const findCookieIndex = (name: string) => cookieStore.findIndex((cookie) => cookie.name === name);

export const headers = jest.fn(() => ({
  get: () => null,
}));

export const cookies = jest.fn(() => {
  const getAll = () => cookieStore.map(clone);
  const get = (name: string) => {
    const entry = cookieStore.find((cookie) => cookie.name === name);
    return entry ? clone(entry) : undefined;
  };
  const set = ({ name, value }: CookieSetOptions) => {
    const index = findCookieIndex(name);
    const newEntry = { name, value };
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

import { __resetCookiesStore, cookies } from 'next/headers';

describe('tests/mocks/next-headers', () => {
  beforeEach(() => {
    __resetCookiesStore();
  });

  it('shares state across multiple cookies() calls', () => {
    const first = cookies();
    const second = cookies();

    first.set('shared', 'value');

    expect(second.get('shared')?.value).toBe('value');
  });

  it('clones stored values to avoid leaking references', () => {
    const jar = cookies();
    const expires = new Date('2025-01-01T00:00:00.000Z');

    jar.set({ name: 'session', value: 'encoded', expires });

    const read = jar.get('session');
    expect(read).not.toBeUndefined();
    expect(read?.expires).not.toBe(expires);
    expect(read?.expires?.toISOString()).toBe(expires.toISOString());
  });

  it('allows deleting by name or cookie entry', () => {
    const jar = cookies();

    jar.set('removable', 'yes');
    jar.set({ name: 'removable-object', value: 'yep' });

    jar.delete('removable');
    expect(jar.get('removable')).toBeUndefined();

    const entry = jar.get('removable-object');
    expect(entry).not.toBeUndefined();
    jar.delete(entry!);

    expect(jar.has('removable-object')).toBe(false);
  });

  it('keeps the shared store mutable across getAll results', () => {
    const jar = cookies();

    jar.set('mutable', 'first');
    const result = jar.getAll();

    jar.set('mutable', 'second');

    expect(result[0].value).toBe('first');
    expect(jar.get('mutable')?.value).toBe('second');
  });
});

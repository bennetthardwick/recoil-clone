import { useState, useEffect, useCallback } from 'react';

interface Disconnect {
  disconnect: () => void;
}

export class Stateful<T> {
  private listeners = new Set<(value: T) => void>();

  constructor(protected value: T) {}

  snapshot(): T {
    return this.value;
  }

  private emit() {
    for (const listener of Array.from(this.listeners)) {
      listener(this.value);
    }
  }

  protected update(value: T) {
    if (this.value !== value) {
      this.value = value;
      this.emit();
    }
  }

  subscribe(callback: (value: T) => void): Disconnect {
    this.listeners.add(callback);
    return {
      disconnect: () => {
        this.listeners.delete(callback);
      },
    };
  }
}

export class Atom<T> extends Stateful<T> {
  public setState(value: T) {
    super.update(value);
  }
}

type SelectorGenerator<T> = (context: { get: <V>(atom: Atom<V>) => V }) => T;

export class Selector<T> extends Stateful<T> {
  private registeredAtoms = new WeakMap<Atom<any>, Disconnect>();

  private addAtom<V>(atom: Atom<V>): V {
    if (!this.registeredAtoms.has(atom)) {
      const result = atom.subscribe(() => this.updateSelector());
      this.registeredAtoms.set(atom, result);
    }

    return atom.snapshot();
  }

  private updateSelector() {
    this.update(this.generate({ get: atom => this.addAtom(atom) }));
  }

  constructor(private readonly generate: SelectorGenerator<T>) {
    super(undefined as any);
    this.value = generate({ get: atom => this.addAtom(atom) });
  }
}

export function atom<V>(value: { key: string; default: V }): Atom<V> {
  return new Atom(value.default);
}

export function selector<V>(value: {
  key: string;
  get: SelectorGenerator<V>;
}): Selector<V> {
  return new Selector(value.get);
}

export function useCoiledValue<T>(value: Stateful<T>): T {
  const [, updateState] = useState({});

  useEffect(() => {
    const { disconnect } = value.subscribe(() => updateState({}));
    return () => disconnect();
  }, [value]);

  return value.snapshot();
}

export function useCoiledState<T>(atom: Atom<T>): [T, (value: T) => void] {
  const value = useCoiledValue(atom);
  return [value, useCallback(value => atom.setState(value), [atom])];
}

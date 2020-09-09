// A few dependencies to allow working with React. Other than these
// we're totally dependency free!
import { useState, useEffect, useCallback } from 'react';

// An interface with the disconnect method. This could just be a function
// but I think having it as an object is more readable.
interface Disconnect {
  disconnect: () => void;
}

// `Stateful` is the base class that manages states and subscriptions.
// Both Atom and Selector are derived from it.
export class Stateful<T> {
  // This is a set of unique callbacks. The callbacks are listeners
  // that have subscribed
  private listeners = new Set<(value: T) => void>();

  // The value property is protected because it needs to be manually
  // assigned in the constructor (because of inheritance quirks)
  constructor(protected value: T) {}

  // Simple method for returning the state. This could return a deep
  // copy if you wanted to be extra cautious.
  snapshot(): T {
    return this.value;
  }

  // The emit method is what updates all the listeners with the new state
  private emit() {
    for (const listener of Array.from(this.listeners)) {
      listener(this.snapshot());
    }
  }

  // The update method is the canonical way to set state. It uses object
  // equality to prevent unnecessary renders. A deep comparison could be
  // performed for complex objects that are often re-created but are the
  // same.
  protected update(value: T) {
    if (this.value !== value) {
      this.value = value;
      // After updating the value, let all the listeners know there's a
      // new state.
      this.emit();
    }
  }

  // The subscribe method lets consumers listen for state updates. Calling
  // the `disconnect` method will stop the callback from being called in
  // the future.
  subscribe(callback: (value: T) => void): Disconnect {
    this.listeners.add(callback);
    return {
      disconnect: () => {
        this.listeners.delete(callback);
      },
    };
  }
}

// The atom is a thin wrapper around the `Stateful` base class. It has a
// single method for updating the state.
//
// Note: `useState` allows you to pass a reducer function, you could add support
// for this if you wanted.
export class Atom<T> extends Stateful<T> {
  public setState(value: T) {
    super.update(value);
  }
}

// The Recoil selector function is a bit gnarley. Essentially the "get" function
// is the way that selectors can subscribe to other selectors and atoms.
type SelectorGenerator<T> = (context: { get: <V>(dep: Stateful<V>) => V }) => T;

// The selector class. It extends `Stateful` so that it can be used as a value like
// atoms.
export class Selector<T> extends Stateful<T> {
  // Keep track of all the registered dependencies. We want to make sure we only
  // re-render once when they change.
  private registeredDeps = new Set<Stateful<any>>();

  // When the get function is called, it allows consumers to subscribe to state
  // changes. This method subscribes to the dependency if it hasn't been already,
  // then returns it's value.
  private addDep<V>(dep: Stateful<V>): V {
    if (!this.registeredDeps.has(dep)) {
      dep.subscribe(() => this.updateSelector());
      this.registeredDeps.add(dep);
    }

    return dep.snapshot();
  }

  // A helper method for running the internal generator method, updating dependencies,
  // returning the computed state and updating all listeners.
  private updateSelector() {
    this.update(this.generate({ get: dep => this.addDep(dep) }));
  }

  constructor(private readonly generate: SelectorGenerator<T>) {
    // This needs to be undefined initially because of Typescript's inheritance rules
    // It's effectively "initialised memory"
    super(undefined as any);
    this.value = generate({ get: dep => this.addDep(dep) });
  }
}

// A helper function for creating a new Atom
// The `key` member is currently unused. I just kept it around to maintain a similar
// API to Recoil.
export function atom<V>(value: { key: string; default: V }): Atom<V> {
  return new Atom(value.default);
}

// A helper method for creating a new Selector
// Likewise the `key` method is just for looking like Recoil.
export function selector<V>(value: {
  key: string;
  get: SelectorGenerator<V>;
}): Selector<V> {
  return new Selector(value.get);
}

// This hook will re-render whenever the supplied `Stateful` value changes.
// It can be used with `Selector`s or `Atom`s.
export function useCoiledValue<T>(value: Stateful<T>): T {
  const [, updateState] = useState({});

  useEffect(() => {
    const { disconnect } = value.subscribe(() => updateState({}));
    return () => disconnect();
  }, [value]);

  return value.snapshot();
}

// Similar to the above method, but it also lets you set state.
export function useCoiledState<T>(atom: Atom<T>): [T, (value: T) => void] {
  const value = useCoiledValue(atom);
  return [value, useCallback(value => atom.setState(value), [atom])];
}

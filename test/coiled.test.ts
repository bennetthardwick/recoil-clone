import { atom, selector, useCoiledState, useCoiledValue } from '../src';
import { act, renderHook } from '@testing-library/react-hooks';

describe('Coiled', () => {
  describe('Stateful', () => {
    describe('useCoiledValue', () => {
      it('should remove all listeners when unmounted', () => {
        const state = atom<string>({ key: 'switch', default: 'off' });

        const result = renderHook(() => useCoiledValue(state));

        expect(Array.from(state['listeners']).length).toBe(1);

        result.unmount();

        expect(Array.from(state['listeners']).length).toBe(0);
      });

      it('should not render if state is same', () => {
        let renders = 0;

        const state = atom<'on' | 'off'>({ key: 'switch', default: 'off' });

        const result = renderHook(() => {
          renders += 1;
          return useCoiledValue(state);
        });

        expect(renders).toBe(1);
        expect(result.result.current).toBe('off');

        act(() => {
          state.setState('on');
        });

        expect(renders).toBe(2);
        expect(result.result.current).toBe('on');

        act(() => {
          state.setState('on');
        });

        expect(renders).toBe(2);
        expect(result.result.current).toBe('on');
      });
    });
  });

  describe('Atom', () => {
    it('should update whenever the state changes', () => {
      const state = atom<'on' | 'off'>({ key: 'switch', default: 'off' });

      const result = renderHook(() => useCoiledState(state));

      expect(result.result.current[0]).toBe('off');

      act(() => {
        state.setState('on');
      });

      expect(result.result.current[0]).toBe('on');
    });

    it('should update the state', () => {
      const state = atom<'on' | 'off'>({ key: 'switch', default: 'off' });

      const result = renderHook(() => useCoiledState(state));

      expect(result.result.current[0]).toBe('off');

      act(() => {
        result.result.current[1]('on');
      });

      expect(result.result.current[0]).toBe('on');
    });

    it('should remove all listeners when unmounted', () => {
      const state = atom<string>({ key: 'switch', default: 'off' });

      const result = renderHook(() => useCoiledState(state));

      expect(Array.from(state['listeners']).length).toBe(1);

      result.unmount();

      expect(Array.from(state['listeners']).length).toBe(0);
    });

    it('should not render if state is same', () => {
      let renders = 0;

      const state = atom<'on' | 'off'>({ key: 'switch', default: 'off' });

      const result = renderHook(() => {
        renders += 1;
        return useCoiledState(state);
      });

      expect(renders).toBe(1);
      expect(result.result.current[0]).toBe('off');

      act(() => {
        state.setState('on');
      });

      expect(renders).toBe(2);
      expect(result.result.current[0]).toBe('on');

      act(() => {
        state.setState('on');
      });

      expect(renders).toBe(2);
      expect(result.result.current[0]).toBe('on');
    });
  });

  describe('Selector', () => {
    it('should update when a dependency updates', () => {
      const person = atom<string>({ key: 'person', default: 'John' });
      const age = atom<number>({ key: 'age', default: 20 });

      const personsAge = selector({
        key: 'persons-age',
        get: ({ get }) => `${get(person)} is ${get(age)} years old`,
      });

      const result = renderHook(() => useCoiledValue(personsAge));

      expect(result.result.current).toBe('John is 20 years old');

      act(() => {
        person.setState('Sarah');
      });

      expect(result.result.current).toBe('Sarah is 20 years old');

      act(() => {
        age.setState(30);
      });

      expect(result.result.current).toBe('Sarah is 30 years old');
    });
  });
});

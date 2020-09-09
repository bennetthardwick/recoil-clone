import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { atom, Selector, selector, useCoiledValue } from '../.';
import './index.scss';

function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

interface ItemCoords {
  x: number;
  y: number;
}

const state = atom<{ [key: string]: ItemCoords }>({
  key: 'items',
  default: {},
});

const selected = atom<string | undefined>({
  key: 'selectedItem',
  default: undefined,
});

const selectedItemSelector = selector({
  key: 'selectedItemCoords',
  get: ({ get }) => {
    const current = get(selected);
    const items = get(state);

    if (!current) {
      return undefined;
    } else {
      return items[current];
    }
  },
});

const ITEM_CACHE = new Map<string, Selector<ItemCoords>>();

function getOrCreateSelector(item: string): Selector<ItemCoords> {
  if (ITEM_CACHE.has(item)) {
    return ITEM_CACHE.get(item)!;
  } else {
    const s = selector({
      key: `item-${item}`,
      get: ({ get }) => get(state)[item]!,
    });

    ITEM_CACHE.set(item, s);

    return s;
  }
}

function updateItem(item: string, x: number, y: number) {
  state.setState({
    ...state.snapshot(),
    [item]: { x, y },
  });
}

let currentIndex = 0;

function getNextId(): string {
  return `${currentIndex++}`;
}

const SIZE = 200;

updateItem(
  getNextId(),
  window.innerWidth / 2 - SIZE / 2,
  window.innerHeight / 2 - SIZE / 2
);

const Item: React.FC<{ item: string }> = React.memo(({ item }) => {
  const selector = getOrCreateSelector(item);
  const value = useCoiledValue(selector);

  const [moving, setMoving] = React.useState(false);

  return (
    <div
      className="item"
      style={{
        background: moving ? '#acacac' : getRandomColor(),
        left: value.x,
        top: value.y,
        width: SIZE,
        height: SIZE,
      }}
      onMouseDown={() => {
        setMoving(true);
        selected.setState(item);
      }}
      onMouseUp={() => {
        setMoving(false);
        selected.setState(undefined);
      }}
      onMouseOut={() => setMoving(false)}
      onMouseMove={e => {
        if (moving) {
          state.setState({
            ...state.snapshot(),
            [item]: {
              x: e.clientX - SIZE / 2,
              y: e.clientY - SIZE / 2,
            },
          });
        }
      }}
    />
  );
});

const Selected: React.FC = React.memo(() => {
  const selected = useCoiledValue(selectedItemSelector);

  if (!selected) {
    return <div>No item selected.</div>;
  }

  return (
    <div>
      Current position: x ({selected.x}) y ({selected.y})
    </div>
  );
});

const App = () => {
  const items = useCoiledValue(state);

  return (
    <div className="parent">
      <div className="explainer">
        This is a test for a{' '}
        <a href="https://github.com/bennetthardwick/recoil-clone">
          Recoil clone written in under 100 lines
        </a>
        . Each component will change colour when it's rendered, this shows that
        only the component that is being interacted with is updating when the
        state changes.
        <br />
        <br />
        <button
          onClick={() =>
            updateItem(
              getNextId(),
              window.innerWidth / 2,
              window.innerHeight / 2
            )
          }
        >
          Add another box
        </button>
        <br />
        <br />
        <Selected />
      </div>
      {Object.keys(items).map(item => (
        <Item key={item} item={item} />
      ))}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));

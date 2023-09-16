import test from 'tape';
import {compile} from './lib.js';

test('basic example', t => {
  const actual = compile(`
    machine light {
      initial state green {
        TIMER => yellow
      }
      state yellow {
        TIMER => red
      }
      state red {
        TIMER => green
      }
    }
  `);

  const expected =
    { predictableActionArguments: true
    , id: 'light'
    , initial: 'green'
    , states:
      {  green: {on: {TIMER: 'yellow'}}
      , yellow: {on: {TIMER:    'red'}}
      ,    red: {on: {TIMER:  'green'}}}};

  t.deepEqual(actual, expected);
  t.end();
});


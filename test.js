import test from 'tape';
import {xmachina} from './lib.js';
import {interpret} from 'xstate';

function state_matches(s, expected) {
  return s.getSnapshot().matches(expected);
}

test('light machine', t => {
  const s = interpret(xmachina`
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

  s.start();
  t.true(state_matches(s, 'green'));

  s.send('TIMER');
  t.true(state_matches(s, 'yellow'));

  s.send('TIMER');
  t.true(state_matches(s, 'red'));

  s.send('TIMER');
  t.true(state_matches(s, 'green'));

  t.end();
});


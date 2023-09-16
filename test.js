import test from 'tape';
import {xmachina} from './lib.js';
import {interpret} from 'xstate';

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
  t.true(s.getSnapshot().matches('green'));

  s.send('TIMER');
  t.true(s.getSnapshot().matches('yellow'));

  s.send('TIMER');
  t.true(s.getSnapshot().matches('red'));

  s.send('TIMER');
  t.true(s.getSnapshot().matches('green'));

  t.end();
});


import tape from 'tape';
import {compile} from './lib.js';

function test(outline, dsl, expected) {
  const actual = compile(dsl);
  tape(outline, t => {
    t.deepEqual(actual, expected);
    t.end();
  });
}

test( 'basic example'

    , `machine light {
         initial state green {
           TIMER => yellow
         }
         state yellow {
           TIMER => red
         }
         state red {
           TIMER => green
         }
       }`

    , { predictableActionArguments: true
      , id: 'light'
      , initial: 'green'
      , states:
        {  green: {on: {TIMER: 'yellow'}}
        , yellow: {on: {TIMER:    'red'}}
        ,    red: {on: {TIMER:  'green'}}}});


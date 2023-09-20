import test from 'tape';
import {compile} from './lib.js';

/*
  testc - compiler test

  A very simple test macro that takes a dsl string
  as an input and an expected machine definition
  as per the XState specification.

  TODO: Is there a way to test that the expected
        machine definition is semantically correct?
*/
function testc(outline, dsl, expected) {
  const actual = compile(dsl);
  test(outline, t => {
    t.deepEqual(actual, expected);
    t.end();
  });
}

testc( 'basic example'

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


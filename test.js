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
  test(outline, t => {
    const actual = compile(dsl).mdef;
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


testc( 'Guarded Transitions'

     , `machine m1 {
          initial state aaa {
            XYZ => is_valid? bbb
          }
          state bbb {}
        }`

     , { predictableActionArguments: true
       , id: 'm1'
       , initial: 'aaa'
       , states:
         { aaa: {on: {XYZ: {cond: 'is_valid', target: 'bbb'}}}
         , bbb: {}}});

testc( 'Extracting References (syntax check)'

     , `machine m001 {
          foo = __REF__001__
          bar = __REF__002__
          baz = __REF__002__

          initial state start {
            STOP => stop
          }

          final state stop {}
        }`

     , { predictableActionArguments: true
       , id: 'm001'
       , initial: 'start'
       , states:
         { start: {on: {STOP: 'stop'}}
         ,  stop: {}}});


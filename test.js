import test from 'tape';
import {interpret} from 'xstate';
import {compile, xmachina} from './lib.js';

/*
  testc - compiler test

  Verifies that the compiler can take a machine
  definition expressed with the DSL and can turn
  it into a machine definition as per the XState
  specification.

  TODO: Find a way to reliably confirm that both
        the machine def returned by the compiler
        **AND** the expected machine def are
        semantically correct.
*/
function testc(outline, dsl, expected) {
  test(outline, t => {
    const actual = compile(dsl).mdef;
    t.deepEqual(actual, expected);
    t.end();
  });
}

function testm(outline, m, run) {
  test(outline, t => {
    const s = interpret(m);
    s.start();
    run(s, t);
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

/*
  WARNING

  This is **NOT** how users are supposed to pass
  references to functions or XState actions,
  but this is what the compiler we will eventually
  send to the compiler. After compilation, there
  is another pass to bind the references.
*/
testc( 'Extracting References (Syntax Check Only)'

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


testm( 'We can pass at least one reference'

     , xmachina`
       machine question {
         is_valid = ${(ctx, ev) => ev.answer === 42}

         initial state searching {
           ON_ANSWER => is_valid? found
         }

         final state found {}
       }`

     , (srv, t) => {
         srv.send({type: 'ON_ANSWER', answer: 10});
         t.true(srv.getSnapshot().matches('searching'));

         srv.send({type: 'ON_ANSWER', answer: 42});
         t.true(srv.getSnapshot().matches('found'));

         t.end();
       });

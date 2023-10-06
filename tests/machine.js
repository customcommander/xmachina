import test from 'tape';
import {interpret} from 'xstate';
import {xmachina} from '../lib.js';


function testm(outline, m, run) {
  test(outline, t => {
    const s = interpret(m);
    s.start();
    run(s, t);
  });
}


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

import {grammar} from 'ohm-js';
import {createMachine} from 'xstate';

function ok(passed, msg) {
  if (passed) return;
  throw new Error(msg);
}

const g = grammar(String.raw`

  XMachina {

    Machine = "machine" id "{" States "}"

    States = ListOf<State, "">

    State = StateType "state" id "{" Events "}" -- typed
          |           "state" id "{" Events "}" -- untyped

    StateType = "initial" | "final"

    Events = ListOf<Event, "">

    Event = id "=>" ListOf<id, "">

    id = letter (alnum | "_")* ("?")? 
  }

`);

const s = g.createSemantics();

s.addOperation('eval',
  {
    /*
      NOTE: I suspect that the `Machine` processing rule
            is likely to grow as the language gets richer.
            That is likely due to the fact that it holds
            lots of useful metadata.
    */
    Machine(_1, _id, _2, _states, _3) {
      const id = _id.eval();
      let states = _states.eval();
      const state_ids = new Set(states.map(s => s.id));

      ok(states.length > 0, 'machine has no states');

      let initial = states.filter(state => state.type == "initial");

      ok(initial.length != 0, 'machine does not have an initial state');
      ok(initial.length == 1, 'machine has more than one initial state');

      function process_rules(rules) {
        let [guard, target, actions] = ( rules
                                       . reduce( (xs, x) => {
                                                   if (x.endsWith("?")) xs[0].push(x);
                                                   else if (state_ids.has(x)) xs[1].push(x);
                                                   else xs[2].push(x);
                                                   return xs;
                                                 }
                                               , [[],[],[]]));

        ok(guard.length <= 1, 'cannot have more than one guard');
        ok(target.length <= 1, 'cannot have more than one action');

        guard = guard[0];
        target = target[0];

        // TODO: fix me. if there is a guard, there must be either a target or an actions or both
        ok(guard != null ? target != null : true, 'a guard must be accompanied with either a target or an action or both');

        if (guard) {
          return {cond: guard.replace('?', ''), target};
        }

        return target;
      }

      states =
        states.reduce( (m, s) => {
                         const {id, type, events} = s;
                         m[id] = {};

                         if (!events) return m;

                         m[id].on = events.on.reduce( (on_acc, [type, ...rules]) => {
                                                        on_acc[type] = process_rules(rules);
                                                        return on_acc;
                                                      }
                                                    , {});
                         if (type == "final") m[id].type = type;
                         return m;
                       }
                     , {}); 

      initial = initial[0].id;

      return ({ predictableActionArguments: true
              , id
              , initial
              , states});
    }

  , States(xs) {
      const states = ( xs
                     . asIteration()
                     . children
                     . map(state => state.eval()));

      return states.length > 0 ? states : null;
    }

  , State_typed(_type, _1, _id, _2, _events, _3) {
      let type = _type.eval();
      let id = _id.eval();
      let events = _events.eval();
      return ({id, type, events});
    }

  , State_untyped(_1, _id, _2, _events, _3) {
      let id = _id.eval();
      let events = _events.eval();
      return ({id,  events});
    }
  
  , StateType(type) {
      return type.sourceString;
    }

  , Events(xs) {
      const events = ( xs
                     . asIteration()
                     . children
                     . map(c => c.eval()));

      if (events.length == 0) return null;

      return events.reduce( (m, e) => {
                              m.on ??= [];
                              m.on.push(e);
                              return m;
                            }
                          , {});
    }

  , Event(_ev, _1, _targets) {
      const ev = _ev.eval();

      const map = {  '*in*': 'entry'
                  , '*out*': 'exit' };

      return [map[ev] ?? ev].concat( _targets
                                   . asIteration()
                                   . children
                                   . map(c => c.eval()));
    }

  , id(head, body, tail) {
      return head.sourceString + body.sourceString + tail.sourceString;
    }
  });

export function compile(source) {
  const result = g.match(source);
  ok(result.succeeded(), 'syntax error');
  const adapter = s(result);
  return adapter.eval();
}

export function xmachina(strings, ...references) {
  const def = compile(strings.join(''));
  const machine = createMachine(def);
  return machine;
}


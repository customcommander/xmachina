import {grammar} from 'ohm-js';
import {createMachine} from 'xstate';

function ok(passed, msg) {
  if (passed) return;
  throw new Error(msg);
}

const g = grammar(String.raw`

  XMachina {

    Machine = "machine" id "{" References States "}"

    References = ListOf<Reference, "">

    Reference = id "=" refid

    refid = "__REF__" digit+ "__"

    States = ListOf<State, "">

    State = StateType "state" id "{" Events "}" -- typed
          |           "state" id "{" Events "}" -- untyped

    StateType = "initial" | "final"

    Events = ListOf<Event, "">

    Event = id "=>" ListOf<id, "">

    id = letter (alnum | "_" | "?")+
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
    Machine(_1, _id, _2, _refs, _states, _3) {
      const id = _id.eval();
      let refs = _refs.eval();
      let states = _states.eval();
      const state_ids = new Set(states.map(s => s.id));

      ok(states.length > 0, 'machine has no states');

      let initial = states.filter(state => state.type == "initial");

      ok(initial.length != 0, 'machine does not have an initial state');
      ok(initial.length == 1, 'machine has more than one initial state');

      function process_rules(rules) {
        let [ guard
            , target
            , actions ] = ( rules
                          . reduce( (xs, x) => {
                                      if (x.endsWith("?")) xs[0].push(x);
                                      else if (state_ids.has(x)) xs[1].push(x);
                                      else xs[2].push(x);
                                      return xs;
                                    }
                                  , [ [/* guard   */]
                                    , [/* target  */]
                                    , [/* actions */]]));

        ok(guard.length <= 1, 'cannot have more than one guard');
        ok(target.length <= 1, 'cannot have more than one action');

        guard = guard[0];
        target = target[0];

        // TODO: fix me. if there is a guard, there must be either a target or an actions or both
        ok(guard != null ? target != null : true, 'a guard must be accompanied with either a target or an action or both');

        if (refs[guard]) {
          refs[guard].type = 'guard';
        }

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

      return ({ refs: ( Object
                      . values(refs)
                      . reduce( (acc, r) => {
                                  acc[r.id] = r;
                                  return acc;
                                }
                              , {}))
              , mdef: { predictableActionArguments: true
                      , id
                      , initial
                      , states}});
    }

  , References(list) {
      return ( list
             . asIteration()
             . children
             . reduce( (m, r) =>
                         Object.assign(m, r.eval())
                     , {}));
    }

  , Reference(_name, _1, _refid) {
      const refid = _refid.eval();
      const refname = _name.eval();
      return ({[refname]: { id: refid
                          , name: refname
                          , type: null /* TBD */}});
    }

  , refid(_1, _d, _2) {
      return `__REF__${_d.sourceString}__`;
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

  , id(head, body) {
      return head.sourceString + body.sourceString;
    }
  });

export function compile(source) {
  const result = g.match(source);
  ok(result.succeeded(), 'syntax error');
  const adapter = s(result);
  return adapter.eval();
}

const rkey = n => `__REF__${String(n).padStart(3, '0')}__`;

export function xmachina(strs, ...refs) {

  // reconstructs the source string by replacing
  // interpolated references with ids.
  const dsl = ( strs
              . slice(1)
              . reduce( (acc, s, i) => acc + rkey(i) + s
                      , strs[0]));

  const {refs: meta, mdef} = compile(dsl);

  const machine =
    createMachine( mdef
                 , ( refs
                   . reduce( (acc, r, i) => {
                               const k = rkey(i);
                               const t = meta[k].type;
                               const n = ( t == 'action' ? 'actions'
                                                         : 'guards');
                               acc[n] ??= {};
                               acc[n][meta[k].name] = r;
                               return acc;
                             }
                           , {})));
  return machine;
}


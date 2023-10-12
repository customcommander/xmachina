import {grammar} from 'ohm-js';
import {createMachine} from 'xstate';

function ok(passed, msg) {
  if (passed) return;
  throw new Error(msg);
}

function nok(failed, msg) {
  if (failed) throw new Error(msg);
}

const g = grammar(String.raw`

  XMachina {

    Machine    = "machine" id "{" References States "}"

    References = ListOf<Reference, "">

    Reference  = id "=" refid

    refid      = "__REF__" digit+ "__"

    States     = ListOf<State, "">

    State      = StateType "state" id "{" Events "}" -- typed
               |           "state" id "{" Events "}" -- untyped

    StateType  = "initial" | "final"

    Events     = Event*

    Event      = event_id "=>" NonemptyListOf<Rules, ",">

    Rules      = rule_id+
    
    event_id   = upper (upper | digit | "_")*          -- regular
               | ( "*entry*" | "*exit*" | "*always*" ) -- reserved
               | "@" digit+                            -- delay

    rule_id    = lower (~(rule_meta end) (alnum | "_" | "-"))* rule_meta?

    rule_meta  = "?"

    id         = letter (alnum | "_" | "-")+
  }

`);

const dict = new Map();

dict.set("?"       , "guard"   );
dict.set("*entry*" , "entry"   );
dict.set("*exit*"  , "exit"    );
dict.set("*always*", "always"  );

function build_rules(ruleset) {
  const ret =
    ( ruleset
    . map(rules => {
            const q = 
              ( rules
              . reduce( (acc, r) => {
                          acc[r.type].push(r.id);
                          return acc;
                        }
                        , {guard: [], target: [], action: []}));

            nok(q.guard.length  > 1, 'cannot have more than one guard');
            nok(q.target.length > 1, 'cannot have more than one target');

            const g = q.guard[0];
            const t = q.target[0];
            const a = ( q.action.length  > 1 ? q.action
                      : q.action.length == 1 ? q.action[0]
                                             : null);

            const ret = {};

            if (g) ret.cond = g;
            if (t) ret.target = t;
            if (a) ret.actions = a;

            return ret;
          }));

  return ret.length > 1 ? ret : ret[0];
}

const s = g.createSemantics();

s.addOperation('eval',
  {
    Machine(_1, _id, _2, _refs, _states, _3) {
      const id = _id.eval();
      const refs = _refs.eval();
      let states = _states.eval();
      const state_ids = new Set(states.map(s => s.id));

      ok(states.length > 0, 'machine has no states'); // TODO: fix with grammar

      let initial = states.filter(state => state.type == "initial");

      ok(initial.length != 0, 'machine does not have an initial state');
      ok(initial.length == 1, 'machine has more than one initial state');


      // Goes over ALL the rules and identify them
      // We need to know if a rule is meant as a target,
      // an action or a guard.

      ( states

      . flatMap(s =>
          [].concat( s.events?.entry  ?? []
                   , s.events?.exit   ?? []
                   , s.events?.always ?? []
                   , s.events?.after  ?? []
                   , s.events?.event  ?? []))

      . flatMap(xs =>
          [].concat(...xs.rules))

      . filter(r =>
          r.type == null)

      . forEach(rule => {
          rule.type = ( state_ids.has(rule.id) ? 'target'
                                               : 'action');
        }));

      states =
        ( states
        . reduce( (m, s) => {
                    const {id, type, events} = s;

                    m[id] = {};

                    if (type == 'final') m[id].type = type;

                    if (!events) return m;
                    
                    nok(events.entry?.length  > 1, 'cannot have more than one "entry" statement.');
                    nok(events.exit?.length   > 1, 'cannot have more than one "exit" statement.');
                    nok(events.always?.length > 1, 'cannot have more than one "always" statement.');

                    if (events.entry)  m[id].entry  = build_rules(events.entry[0].rules);
                    if (events.exit)   m[id].exit   = build_rules(events.exit[0].rules);
                    if (events.always) m[id].always = build_rules(events.always[0].rules);

                    if (events.event) m[id].on = ( events
                                                 . event
                                                 . reduce( (acc, e) => {
                                                             acc[e.id] = build_rules(e.rules);
                                                             return acc;
                                                           }
                                                         , {}));

                    if (events.after) m[id].after = ( events
                                                    . after
                                                    . reduce( (acc, e) => {
                                                                acc[e.id] = build_rules(e.rules);
                                                                return acc;
                                                              }
                                                            , {}));

                   return m;
                  }
                , {})); 

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

      return states.length > 0 ? states : null; // FIXME: grammar should forbid this
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
      if (xs.children.length == 0) return null;
      return ( xs
             . children
             . reduce( (acc, x) => {
                         const ev = x.eval();
                         const {type} = ev;
                         acc[type] ??= [];
                         acc[type].push(ev);
                         return acc;
                       }
                     , {}));
    }

  , Event(_ev, _1, _rules) {
      const ev = _ev.eval();
      ev.rules = _rules.asIteration().children.map(r => r.eval());
      return ev;
    }

  , event_id_regular(_head, _tail) {
      const id = _head.sourceString + _tail.sourceString;
      return {type: 'event', id};
    }

  , event_id_reserved(_id) {
      const id = _id.sourceString;
      const type = dict.get(id);
      return {type};
    }

  , event_id_delay(_1, _id) {
      // TODO: _id could also be a property in 'machine.options.delays'.
      return {type: 'after', id: parseInt(_id.sourceString, 10)};
    }

  , Rules(_rules) { 
      return _rules.children.map(r => r.eval());
    }

  , rule_id(_head, _body, _meta) {
      const id = _head.sourceString + _body.sourceString;
      const type = dict.get(_meta.sourceString);
      return ({type, id});
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


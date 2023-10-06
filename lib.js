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

    Events     = ListOf<Event, "">

    Event      = event_id "=>" NonemptyListOf<Rules, "||">

    Rules      = rule_id+
    
    event_id   = upper (upper | digit | "_")* -- regular
               | ( "*in*" | "*out*" )         -- reserved

    rule_id    = lower (~(rule_meta end) (alnum | "_" | "-"))* rule_meta?

    rule_meta  = "?"

    id         = letter (alnum | "_" | "-")+
  }

`);

const s = g.createSemantics();

const dict = new Map();

dict.set(     "?", "guard" );
dict.set(  "*in*", "entry" );
dict.set( "*out*", "exit"  );

function foo(ruleset) {
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

            nok(q.guard.length > 1, 'cannot have more than one guard');
            nok(q.target.length > 1, 'cannot have more than one target');

            const g = q.guard[0];
            const t = q.target[0];
            const a = q.action.length > 0 ? q.action : null;

            if (!g && !t) return a;
            if (!g && !a) return t;

            const ret = {};

            if (g) ret.cond = g;
            if (t) ret.target = t;
            if (a) ret.actions = a;

            return ret;
          }));

  return ret.length > 1 ? ret : ret[0];
}

function bar(ev) {
  if (ev.entry) return ({entry: foo(ev.rules)});
  if (ev.exit) return ({exit: foo(ev.rules)});
  return ({[ev.event]: foo(ev.rules)});
}

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

      ok(states.length > 0, 'machine has no states'); // TODO: fix with grammar

      let initial = states.filter(state => state.type == "initial");

      ok(initial.length != 0, 'machine does not have an initial state');
      ok(initial.length == 1, 'machine has more than one initial state');


      // Goes over ALL the rules and identify them
      // We need to know if a rule is meant as a target,
      // an action or a guard.

      ( states

      . flatMap(s =>
          ( s
          . events
          . flatMap(e => [].concat(...e.rules))))

      . filter(r =>
          r.type == null)

      . forEach(rule => {
          rule.type = ( state_ids.has(rule.id) ? 'target'
                                               : 'action');
        }));

      states =
        states.reduce( (m, s) => {
                         const {id, type, events} = s;
                         m[id] = {};

                         if (!events) return m;
                         
                         events.forEach(e => {
                           const b = bar(e);
                           if (b.entry || b.exit) Object.assign(m[id], b);
                           else {
                             m[id].on ??= {};
                             Object.assign(m[id].on, b);
                           }
                         });

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
      return ( xs
             . asIteration()
             . children.map(x => x.eval()));
    }

  , Event(_ev, _1, _rules) {
      const ev = _ev.eval();
      ev.rules = _rules.asIteration().children.map(r => r.eval());
      return ev;
    }

  , event_id_regular(_head, _tail) {
      const id = _head.sourceString + _tail.sourceString;
      return ({event: id});
    }

  , event_id_reserved(_id) {
      const id = _id.sourceString;
      const type = dict.get(id);
      return ({[type]: true});
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


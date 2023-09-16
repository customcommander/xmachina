import {grammar} from 'ohm-js';
import {createMachine} from 'xstate';

const g = grammar(String.raw`

  XMachina {

    Machine = "machine" identifier "{" States "}"

    States = ListOf<State, "">

    State = StateType "state" identifier "{" Events "}" -- typed
          |           "state" identifier "{" Events "}" -- untyped

    StateType = "initial" | "final"

    Events = ListOf<Event, "">

    Event = identifier "=>" identifier

    identifier = (letter | "_") (alnum | "_")* 
  }

`);

function ok(passed, msg) {
  if (passed) return;
  throw new Error(msg);
}

const s = g.createSemantics();

s.addOperation('eval',
  {

    Machine(_1, _id, _2, _states, _3) {
      let id = _id.eval();
      let states = _states.eval();

      ok(states.length > 0, 'machine has no states');

      let initial = states.filter(state => state.type == "initial");

      ok(initial.length != 0, 'machine does not have an initial state');
      ok(initial.length == 1, 'machine has more than one initial state');

      initial = initial[0].id;

      states = states.reduce( (m, s) => {
                                m[s.id] = s.events;
                                if (s.type == "final") m[s.id].type = "final";
                                return m;
                              }
                            , {}); 

      return ({id, initial, states});
    }

  , States(xs) {
      const states = xs.asIteration().children.map(state => state.eval());
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
      const events = xs.asIteration().children.map(c => c.eval());
      if (events.length == 0) return {};
      return ({on: Object.assign({}, ...events)})
    }

  , Event(_ev, _1, _target) {
      let ev = _ev.eval();
      let target = _target.eval();
      return ({[ev]: target});
    }

  , identifier(head, tail) {
      return head.sourceString + tail.sourceString;
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



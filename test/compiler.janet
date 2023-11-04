(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (print (xm/xm->xstate str)))

(test-stdout
 (sut
  `
  machine foo {
    [*] -> bar;
    baz -> [*];
    bat -> [*];
  }
`) `
  {
    "id": "foo",
    "predictableActionArguments": true,
    "states": {
      "bar": {},
      "baz": {
        "type": "final"
      },
      "bat": {
        "type": "final"
      }
    },
    "initial": "bar"
  }
`)

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
  }
`) `
  {
    "id": "foo",
    "predictableActionArguments": true,
    "states": {
      "bar": {},
      "baz": {}
    },
    "initial": "bar"
  }
`)

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
    "predictableActionArguments": true,
    "id": "foo",
    "initial": "bar"
  }
`)

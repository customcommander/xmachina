(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (print (xm/compile str)))

(test-stdout
 (sut
  `
  machine foo {
    [*] -> bar;
  }
`) `
  {
    "predictableActionArguments": true,
    "id": "foo",
    "initial": "bar"
  }
`)

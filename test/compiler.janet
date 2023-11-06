(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (print (xm/xm->xstate str)))

(test-stdout
 (sut
  `
  machine foo {
    [*] -> bar;
    bar -> baz : DONE;
    bar -> bat : ERROR;
    baz -> [*];
    bat -> [*];
  }
`) `
  {
    "id": "foo",
    "predictableActionArguments": true,
    "states": {
      "bar": {
        "on": {
          "ERROR": "bat",
          "DONE": "baz"
        }
      },
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

(test-stdout (sut `

  machine foo {
    [*] -> a;
      a -> b : CLICK (inc    );
      b -> c : CLICK (inc log);
      c -> [*];
  }

`) `
  {
    "id": "foo",
    "predictableActionArguments": true,
    "states": {
      "c": {
        "type": "final"
      },
      "a": {
        "on": {
          "CLICK": {
            "target": "b",
            "actions": [
              "inc"
            ]
          }
        }
      },
      "b": {
        "on": {
          "CLICK": {
            "target": "c",
            "actions": [
              "inc",
              "log"
            ]
          }
        }
      }
    },
    "initial": "a"
  }
`)

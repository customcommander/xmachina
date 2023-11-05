(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (xm/xm->xstate str))

# TODO: get rid of this
(test-error (sut "42") "waat?")

(test-error (sut `
  machine t1000 {
    foo -> bar : CLICK;
  }
`) "no initial state")

(test-error (sut `
  machine t2000 {
    [*] -> foo;
    [*] -> bar;
    foo -> bat : CLICK;
  }
`) "expected exactly one initial state")


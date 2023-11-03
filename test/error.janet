(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (xm/xm->xstate str))

(test-error (sut "42") "waat?")

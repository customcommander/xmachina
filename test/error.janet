(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (xm/compile str))

(test-error (sut "42") "waat?")

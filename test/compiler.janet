(import ../xmachina :as xm)

(use judge)

(defn sut [str]
  (print (xm/compile str)))

(test-stdout (sut ``
  machine delta8 {
    state sigma9 {
      4
    }
  }
``) `
  {
    "states": [
      {
        "id": "sigma9",
        "body": "4"
      }
    ],
    "id": "delta8"
  }
`)

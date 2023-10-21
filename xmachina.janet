(defn foo [machine-id states]
  {:machine machine-id
   :states states})

(defn bar [state-id state-body]
  {:id state-id
   :body state-body})

(def xmachina-lang
  (peg/compile
   ~{:main :machine

     :machine
       {:main (/ :definition ,foo)

        :definition (* :s*
                       "machine"
                       :s+
                       (<- :w+)
                       :opening-bracket
                       (group (some :state))
                       :closing-bracket)}


     :state
       {:main (/ :definition ,bar)
        :definition (* :s*
                       "state"
                       :s+
                       (<- :w+)
                       :opening-bracket
                       (<- :d)
                       :closing-bracket)}

     :opening-bracket (* :s* "{" :s*)
     :closing-bracket (* :s* "}" :s*)}))

(defn main [&]
  (pp (peg/match xmachina-lang "

          machine fizzbuzz81 {

                    state sigma9 {
                          8
                    }

state sigma10 {6}

          }

")))


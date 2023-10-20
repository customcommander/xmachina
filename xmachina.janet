(def xmachina-lang
  (peg/compile
   ~{:main :machine-def

     :machine-def (* :s*
                     "machine"
                     :s+
                     (/ (<- :w+) ,|(struct :machine $))
                     :opening-bracket
                     :closing-bracket)

     :opening-bracket (* :s* "{" :s*)

     :closing-bracket (* :s* "}" :s*)}))

(defn main [&]
  (pp (peg/match xmachina-lang "

          machine fizzbuzz81 {



          }

")))


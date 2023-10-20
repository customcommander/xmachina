(def xmachina-lang
  (peg/compile
   ~{:main :machine

     :machine (* :s*
                 :machine-kw
                 :s+
                 :machine-id
                 :opening-bracket
                 :closing-bracket)

     :machine-kw "machine"

     :machine-id (/ (<- :w+) ,|(struct :machine $))

     :opening-bracket (* :s* "{" :s*)

     :closing-bracket (* :s* "}" :s*)}))

(defn main [&]
  (pp (peg/match xmachina-lang "

          machine fizzbuzz81 {



          }

")))


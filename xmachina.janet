(def grammar
  (peg/compile
   ~{:main (sequence :s* 
                     "machine"
                     :s+
                     (/ (<- :w+) ,|(struct :machine $))
                     :opening-bracket
                     :closing-bracket)

     :opening-bracket (sequence :s* "{" :s*)

     :closing-bracket (sequence :s* "}" :s*)}))

(defn main [&]
  (pp (peg/match grammar "    


          machine fizzbuzz81 {



          }

"))
)


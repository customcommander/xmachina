(import spork)

(defn ->machine-ast [machine-id states]
  {:id machine-id
   :states states})

(defn ->state-ast [state-id state-body]
  {:id state-id
   :body state-body})

(def xmachina-lang
  (peg/compile
   ~{:main :machine

     :machine
       {:main (/ :definition ,->machine-ast)
        :definition (* :s*
                       "machine"
                       :s+
                       (<- :w+)
                       :opening-bracket
                       (group (some :state))
                       :closing-bracket)}


     # state identifier { ... }
     :state
       {:main (/ :definition ,->state-ast)
        :definition (* :s*
                       "state"
                       :s+
                       (<- :w+)
                       :opening-bracket
                       (<- :d)
                       :closing-bracket)}


     :opening-bracket (* :s* "{" :s*)
     :closing-bracket (* :s* "}" :s*)}))

(defn parse [str]
  ((peg/match xmachina-lang str) 0))

(defn compile [str]
  (-> str
      (parse)
      (spork/json/encode "  " "\n")))

(defn main [&]
  (-> (file/read stdin :all)
      (compile)
      (print)))


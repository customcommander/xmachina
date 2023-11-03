(import spork/json)

(defn ->machine-ast [machine-id states]
  {:predictableActionArguments true
   :id machine-id
   :initial (let [state (find |(get $ :initial) states)]
              (state :state))
   :states (merge ;(map (fn [{:state id}]
                          {id {}}) states))})

(defn ->initial-ast [id]
  {:state id
   :initial true})

(defn ->final-ast [id]
  {:state id
   :final true})

(def xmachina-lang
  (peg/compile
   ~{:main (* :s* (/ :machine ,->machine-ast) :s* -1)

     # work in progress:
     # identifier should also include "-_:."
     # and additional meta character such as "?".
     :id :w+

     :initial (/ (* "[*]" :s+ "->" :s+ (<- :id) :s* ";") ,->initial-ast)

     :final (/ (* (<- :id) :s+ "->" :s+ "[*]" :s* ";") ,->final-ast)

     :machine (* "machine" :s+ (<- :id) :s+ "{" (group (some (* :s* (+ :initial :final) :s*))) "}")}))

(defn parse [str]
  ((peg/match xmachina-lang str) 0))

(defn xm->xstate [xm-str]
  # WIP: I just needed a quick way to check that
  #      I can capture and test parsing errors.
  (if (= "42" xm-str)
    (error "waat?")
    (-> xm-str
        (parse)
        (json/encode "  " "\n"))))

(defn main [&]
  (-> stdin
      (file/read :all)
      (xm->xstate)
      (print)))


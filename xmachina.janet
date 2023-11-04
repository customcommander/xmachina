(import spork/json)

# TODO: find a better name for this function
(defn tk-2
  "Some doc
  goes here"
  [statements]
  (if-let [_ (find | (= ($ :stmt-type) :final) statements)]
    {:type "final"}
    {}))

# TODO: find a better name for this function
(defn tk-1 [statements]
  (let [{:state state-id} (statements 0)]
    {state-id (merge (tk-2 statements))}))

(defn ->machine-ast [machine-id states]
  {:predictableActionArguments true
   :id machine-id
   :initial (let [st (find | (= ($ :stmt-type) :initial) states)]
              (st :state))
   :states (let [grouped-by-states (group-by | ($ :state) states)]
             (merge {} ;(map tk-1 grouped-by-states)))})

(defn ->initial-ast [id]
  {:stmt-type :initial
   :state id})

(defn ->final-ast [id]
  {:stmt-type :final
   :state id})

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


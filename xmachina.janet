(import spork/json)

(defn xstate-transition
  ```
  Document this
  ```
  [xs]
  (let [transition (xs 0)
        target (transition :state-next)]
    (if-let [actions (transition :actions)]
      {:target target
       :actions actions}
      target)))

(defn tk-3
  ```
  Some doc goes
  here and
  here.
  ```
  [statements]
  (let [evs (filter | (= ($ :stmt-type) :transition) statements)]
    (if (not (empty? evs))
      (do
        (def grp (group-by | ($ :event) evs))
        (loop [[k v] :pairs grp]
          (set (grp k) (xstate-transition v)))
        {:on grp})
      {})))

# TODO: find a better name for this function
(defn tk-2
  "Some doc
  goes here"
  [statements]
  (if-let [_ (find | (has-key? $ :final) statements)]
    {:type "final"}
    {}))

# TODO: find a better name for this function
(defn tk-1 [statements]
  (let [{:state state-id} (statements 0)]
    {state-id (merge {}
                     (tk-2 statements)
                     (tk-3 statements))}))

(defn ->machine-ast [machine-id states]
  {:predictableActionArguments true
   :id machine-id
   :initial (let [st (filter | (has-key? $ :initial) states)]
              (assert (= (length st) 1)
                      (if (empty? st)
                        "no initial state"
                        "expected exactly one initial state"))
              (get-in st [0 :state]))
   :states (let [grouped-by-states (group-by | ($ :state) states)]
             (merge {} ;(map tk-1 grouped-by-states)))})

(defn ->initial-ast [id]
  {:initial true
   :state id})

(defn ->final-ast [id]
  {:final true
   :state id})

(defn is-guard? [id]
  (string/has-suffix? "?" id))

(defn ->transition-ast [from to event &opt actions]
  (default actions [])
  (def ast
    (merge {:stmt-type :transition
            :state from
            :state-next to
            :event event}
           (group-by | (if (is-guard? $)
                         :guard
                         :actions)
                     actions)))
  (if-let [guard (ast :guard)]
    (assert (= (length guard) 1)
            "too many guards"))
  ast)

(def xmachina-lang
  ```
  ```
  (peg/compile
   ~{:main (* :s* (/ :machine ,->machine-ast) :s* -1)

     # work in progress:
     # identifier should also include "-_:."
     # and additional meta character such as "?".
     :id (/ (<- (* :a (any (+ :w (set "_-:."))) (? "?"))) ,identity)

     :actions (? (* "(" (group (some (* :s* :id :s*))) ")"))

     :initial (/ (* "[*]" :s+ "->" :s+ :id :s* ";") ,->initial-ast)

     :transition (/ (* :id :s+ "->" :s+ :id :s+ ":" :s+ :id :s* :actions :s* ";") ,->transition-ast)

     :final (/ (* :id :s+ "->" :s+ "[*]" :s* ";") ,->final-ast)

     :machine (* "machine" :s+ :id :s+ "{" (group (some (* :s* (+ :transition :initial :final) :s*))) "}")}))

(defn xm->xstate [xm-str]
  (if-let [xstate (peg/match xmachina-lang xm-str)]
    (json/encode (xstate 0) "  " "\n")
    # TODO:
    # The compilation error message should definitely
    # include more details as to what went wrong but I have
    # no idea how to do this so I am leaving this other big
    # and important piece for later.
    (error "compilation error")))

(defn main [&]
  (-> stdin
      (file/read :all)
      (xm->xstate)
      (print)))


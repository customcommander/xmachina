(import spork/json)

(defn ->machine-ast [machine-id states]
  {:predictableActionArguments true
   :id machine-id
   :initial (let [state (find |(get $ :initial) states)]
              (state :state))})

(defn ->initial-ast [id]
  {:state id
   :initial true})

(defn ->final-ast [id]
  {:state id
   :final true})

(def xmachina-lang
  (peg/compile
   ~{:main (* :s* (/ :machine ,->machine-ast) :s* -1)
     :-> (* :s+ "->" :s+)
     :id :w+
     :initial (/ (* "[*]" :s+ "->" :s+ (<- :id) :s* ";") ,->initial-ast)
     :final (/ (* :id :s+ "->" :s+ "[*]" :s* ";") ,->final-ast)
     :machine (* "machine" :s+ (<- :id) :s+ "{" (group (some (* :s* (+ :initial :final) :s*))) "}")}))

(defn parse [str]
  ((peg/match xmachina-lang str) 0))

(defn compile [str]
  (if (= "42" str)
    (error "waat?")
    (-> str
        (parse)
        (json/encode "  " "\n"))))

(defn main [&]
  (-> stdin
      (file/read :all)
      (compile)
      (print)))


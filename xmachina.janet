(import spork/json)

(defn ->machine-ast [machine-id initial]
  {:predictableActionArguments true
   :id machine-id
   :initial initial})

(def xmachina-lang
  (peg/compile
   ~{:main (* :s* (/ :machine ,->machine-ast) :s* -1)
     :-> (* :s+ "->" :s+)
     :id :w+
     :initial (/ (* "[*]" :s+ "->" :s+ (<- :id) :s* ";") ,identity)
     :machine (* "machine" :s+ (<- :id) :s+ "{" :s* :initial :s* "}")}))

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


(declare-project
  :name "xmachina"
  :description "A small DSL that compiles to XState."
  :dependencies
   [{:url "https://github.com/ianthehenry/judge.git"
     :tag "v2.7.0"}
    {:url "https://github.com/janet-lang/spork"}])

(task "test" []
      (shell "./jpm_tree/bin/judge"))

(declare-executable
  :name "xmachina"
  :entry "xmachina.janet")


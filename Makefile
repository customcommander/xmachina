test: $(patsubst tests/%.txt,out/%.test.js,$(wildcard tests/*.txt))
	npx tape out/*.test.js tests/machine.js

out/%.in: tests/%.txt
	mkdir -p $(@D)
	sed -n -e '/INPUT/,/OUTPUT/{//!p;}' $< >$@

out/%.out: tests/%.txt
	mkdir -p $(@D)
	sed -n -e '/OUTPUT/,$${//!p;}' $< >$@

out/%.test.js: out/%.in out/%.out tests/template.js lib.js
	sed -e '/TEST_ID/ s/TEST_ID/$*/' \
			-e '/INPUT/ r out/$*.in' \
			-e '/INPUT/ d' \
			-e '/OUTPUT/ r out/$*.out' \
			-e '/OUTPUT/ d' \
			tests/template.js >$@

clean:; rm -rfv out

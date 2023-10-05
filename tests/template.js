// Template for compiler tests
import test from 'tape';
import {compile} from '../lib.js';

test('TEST_ID', t => {
  const {mdef: actual} = compile(`
    INPUT
  `);

  const expected = (
    OUTPUT
  );

  t.deepEqual(actual, expected, 'compiled with no errors');
  t.end();
});


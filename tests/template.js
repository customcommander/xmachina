// Template for compiler tests
import test from 'tape';
import {createMachine} from 'xstate';
import {compile} from '../lib.js';

test('TEST_ID', t => {
  const {mdef: actual} = compile(`
    INPUT
  `);

  const expected = (
    OUTPUT
  );

  // Cheap way of making sure that both machines are valid.
  // TODO: check if there's a better way to do this. JSON schema?
  createMachine(actual);
  createMachine(expected);

  t.deepEqual(actual, expected, 'compiled with no errors');
  t.end();
});


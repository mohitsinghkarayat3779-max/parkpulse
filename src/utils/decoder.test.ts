import test from 'node:test';
import assert from 'node:assert/strict';
import { decode } from './decoder';

test('Test 1: 10:00, 2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN', () => {
  // Monday 26 Oct 2026, 10:00
  const date = new Date('2026-10-26T10:00:00');
  const result = decode('2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN', date);

  assert.ok(result);
  assert.equal(result.kind, 'limit');
  assert.equal(
    result.summary,
    'Up to 2 hours, 8 AM to 6 PM, Monday to Friday. No limit outside those times.'
  );
  assert.equal(result.verdict, 'You can park now, but move within 2 hours.');
  assert.equal(result.active, true);
});

test('Test 2: 10:00, NO PARKING 7-9AM 4-6PM MON-FRI', () => {
  // Monday 26 Oct 2026, 10:00 (outside 7-9AM and 4-6PM)
  const date = new Date('2026-10-26T10:00:00');
  const result = decode('NO PARKING 7-9AM 4-6PM MON-FRI', date);

  assert.ok(result);
  assert.equal(result.kind, 'no');
  assert.equal(
    result.summary,
    'No parking 7 AM to 9 AM and 4 PM to 6 PM, Monday to Friday.'
  );
  assert.equal(result.verdict, "You can park now. The rule isn't active.");
  assert.equal(result.active, false);
});

test('Test 3: 17:00 with NO PARKING 7-9AM 4-6PM MON-FRI', () => {
  // Monday 26 Oct 2026, 17:00 (inside 4-6PM window)
  const date = new Date('2026-10-26T17:00:00');
  const result = decode('NO PARKING 7-9AM 4-6PM MON-FRI', date);

  assert.ok(result);
  assert.equal(result.verdict, "Don't park here now.");
  assert.equal(result.active, true);
});

test('Test 4: Sunday 10:00 with 2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN', () => {
  // Sunday 25 Oct 2026, 10:00
  const date = new Date('2026-10-25T10:00:00');
  const result = decode('2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN', date);

  assert.ok(result);
  assert.equal(result.active, false);
  assert.equal(result.verdict, 'You can park now with no limit.');
});

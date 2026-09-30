import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTestName } from './sweep.js';

test('matches names the suites create', () => {
  for (const n of ['Aura Test Bot', 'Overtime Poison E2E', 'Overtime Attacker E2E', 'Test Midi Damage',
    'Test Advantage', 'KB Create E2E', 'E2E Char Feature', 'Omega Strike E2E', 'Auto Desc Test', 'Advanced Desc Test'])
    assert.ok(isTestName(n), n);
});

test('never matches real campaign content (names seen in the test world)', () => {
  for (const n of ['test durak', 'test arebos', "test Gorak'thor", 'TestAttackActivity', 'TestSaveActivity',
    'AC Consistency Check', 'Aura Test Bot 2', 'Dummy Reaction Feature', 'Custom attacks', 'Test Sword Of Doom',
    'Guard', 'Poisoned Blade Strike', 'Class Features - Backup', 'Poison Nova', 'Restraining Web', 'No AC'])
    assert.ok(!isTestName(n), n);
});

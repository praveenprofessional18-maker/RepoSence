import assert from 'node:assert/strict'
import test from 'node:test'
import { getThemeColor, normalizeThemePreference, resolveThemePreference } from './themePreference.js'

test('only accepts supported saved theme values', () => {
  assert.equal(normalizeThemePreference('dark'), 'dark')
  assert.equal(normalizeThemePreference('light'), 'light')
  assert.equal(normalizeThemePreference('system'), null)
  assert.equal(normalizeThemePreference(null), null)
})

test('uses a saved preference before the operating system preference', () => {
  assert.equal(resolveThemePreference('light', true), 'light')
  assert.equal(resolveThemePreference('dark', false), 'dark')
})

test('uses the operating system preference when no valid selection is saved', () => {
  assert.equal(resolveThemePreference(null, true), 'dark')
  assert.equal(resolveThemePreference('invalid', false), 'light')
})

test('provides browser chrome colors for both themes', () => {
  assert.equal(getThemeColor('dark'), '#0b1120')
  assert.equal(getThemeColor('light'), '#f8fafc')
})

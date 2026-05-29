/**
 * i18n completeness tests
 *
 * Every key present in en.json must exist in de.json, fr.json and hi.json.
 * Every value must be a non-empty string.
 * No locale file may have extra keys that en.json doesn't define.
 * This runs in CI to prevent shipping a broken language.
 */

import { describe, it, expect } from 'vitest'
import en from '@/messages/en.json'
import de from '@/messages/de.json'
import fr from '@/messages/fr.json'
import hi from '@/messages/hi.json'

type MessageTree = Record<string, unknown>

function collectLeafPaths(obj: MessageTree, prefix = ''): string[] {
  const paths: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      paths.push(...collectLeafPaths(value as MessageTree, path))
    } else {
      paths.push(path)
    }
  }
  return paths
}

function getValueAtPath(obj: MessageTree, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as MessageTree)[key]
    return undefined
  }, obj)
}

const enPaths = collectLeafPaths(en as MessageTree)

const locales = [
  { name: 'de', messages: de as MessageTree },
  { name: 'fr', messages: fr as MessageTree },
  { name: 'hi', messages: hi as MessageTree },
]

describe('i18n completeness', () => {
  for (const { name, messages } of locales) {
    describe(`messages/${name}.json`, () => {
      it(`has every key that en.json has (${enPaths.length} keys)`, () => {
        const localePaths = collectLeafPaths(messages)
        const missing = enPaths.filter(p => !localePaths.includes(p))
        expect(missing, `Missing keys in ${name}.json:\n${missing.join('\n')}`).toHaveLength(0)
      })

      it('has no extra keys that en.json does not define', () => {
        const localePaths = collectLeafPaths(messages)
        const extra = localePaths.filter(p => !enPaths.includes(p))
        expect(extra, `Extra keys in ${name}.json:\n${extra.join('\n')}`).toHaveLength(0)
      })

      it('every value is a non-empty string', () => {
        const badKeys: string[] = []
        for (const path of enPaths) {
          const value = getValueAtPath(messages, path)
          if (typeof value !== 'string' || value.trim() === '') {
            badKeys.push(`${path} = ${JSON.stringify(value)}`)
          }
        }
        expect(badKeys, `Non-string or empty values in ${name}.json:\n${badKeys.join('\n')}`).toHaveLength(0)
      })

      it('has no ICU placeholder mismatches with en.json', () => {
        const mismatchedKeys: string[] = []
        const icuPattern = /\{[^}]+\}/g
        for (const path of enPaths) {
          const enVal = getValueAtPath(en as MessageTree, path) as string
          const localeVal = getValueAtPath(messages, path) as string
          const enPlaceholders = enVal.match(icuPattern) ?? []
          const localePlaceholders = localeVal.match(icuPattern) ?? []
          if (JSON.stringify(enPlaceholders.sort()) !== JSON.stringify(localePlaceholders.sort())) {
            mismatchedKeys.push(`${path}: en=${JSON.stringify(enPlaceholders)} vs ${name}=${JSON.stringify(localePlaceholders)}`)
          }
        }
        expect(mismatchedKeys, `ICU placeholder mismatches in ${name}.json:\n${mismatchedKeys.join('\n')}`).toHaveLength(0)
      })
    })
  }

  describe('en.json (baseline)', () => {
    it('has at least 350 translation keys', () => {
      expect(enPaths.length).toBeGreaterThanOrEqual(350)
    })

    it('covers all required namespaces', () => {
      const namespaces = Object.keys(en)
      const required = ['nav', 'common', 'assets', 'liabilities', 'goals', 'renewals', 'settings', 'auth', 'connections', 'family', 'documents', 'forecast', 'spending']
      for (const ns of required) {
        expect(namespaces, `Missing namespace: ${ns}`).toContain(ns)
      }
    })

    it('every value is a non-empty string', () => {
      const bad: string[] = []
      for (const path of enPaths) {
        const value = getValueAtPath(en as MessageTree, path)
        if (typeof value !== 'string' || value.trim() === '') {
          bad.push(`${path} = ${JSON.stringify(value)}`)
        }
      }
      expect(bad).toHaveLength(0)
    })
  })
})

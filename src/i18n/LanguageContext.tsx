import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { en, pl, type TranslationKey } from './translations'

export type Language = 'pl' | 'en'

const STORAGE_KEY = 'gothic-save-explorer.language'
const dictionaries: Record<Language, Record<TranslationKey, string>> = { pl, en }

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLanguage(): Language {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'pl'
  } catch {
    return 'pl'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = dictionaries[language]
    return {
      language,
      setLanguage: (next: Language) => {
        setLanguageState(next)
        try {
          window.localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Private/incognito contexts may block storage — the toggle still works for the session.
        }
      },
      t: (key: TranslationKey) => dictionary[key] ?? key,
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage musi być użyty wewnątrz LanguageProvider')
  return context
}

export function useT(): LanguageContextValue['t'] {
  return useLanguage().t
}

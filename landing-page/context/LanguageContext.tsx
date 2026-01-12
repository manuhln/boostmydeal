/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import en from '@/constants/translations/en.json'
import fr from '@/constants/translations/fr.json'
import es from '@/constants/translations/es.json'
import { LanguageContextType, Locale } from '@/types/Index'

const translations = { en, fr, es }
const LOCALE_STORAGE_KEY = 'boostmydeal-locale'

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null

    if (saved && ['en', 'fr', 'es'].includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(saved)
    } else {
      const browserLang = navigator.language.split('-')[0]
      if (['en', 'fr', 'es'].includes(browserLang)) {
        setLocaleState(browserLang as Locale)
      }
    }

    setMounted(true)
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[locale]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation key not found: ${key} for locale: ${locale}`)
        return key
      }
    }

    return typeof value === 'string' ? value : key
  }

  if (!mounted) return null

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }

  return context
}

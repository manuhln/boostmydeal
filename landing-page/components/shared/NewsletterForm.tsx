'use client'

import { useTranslation } from '@/context/LanguageContext'
import { useState, FormEvent } from 'react'


export function NewsletterForm({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validation
    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: t('newsletter.error') })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Ici tu ferais ton appel API réel
      // const response = await fetch('/api/newsletter', {
      //   method: 'POST',
      //   body: JSON.stringify({ email })
      // })

      setMessage({ type: 'success', text: t('newsletter.success') })
      setEmail('')
    } catch {
      setMessage({ type: 'error', text: t('newsletter.error') })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className={className ? className : "flex p-2 bg-gray-50/20 gap-2 text-white placeholder-gray-500 rounded-xl border-none border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent"}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('newsletter.placeholder')}
          className="flex-1 px-4 py-2.5 bg-transparent bg-gray-100 text-white placeholder-gray-500 rounded-lg border-none border-gray-700 focus:outline-none focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2.5 bg-main text-white font-medium rounded-xl hover:bg-main "
        >
          {isLoading ? '...' : t('newsletter.submit')}
        </button>
      </form>

      {/* Message de succès/erreur */}
      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
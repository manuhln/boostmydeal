'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from "sonner"

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  logo: string;
}

interface WaitlistFormData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  company: string;
}

interface WaitlistResult {
  success: boolean;
  message?: string;
}

export default function WaitlistModal({ isOpen, onClose, logo }: WaitlistModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<WaitlistFormData>({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    company: ''
  });
  const { t } = useTranslation()
  const [waitlistResult, setWaitlistResult] = useState<WaitlistResult | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('form');
        setFormData({
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          company: ''
        });
        setWaitlistResult(null);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result: WaitlistResult = await response.json();

      if (result.success) {
        setWaitlistResult(result);
        setStep('success');
      } else {
        toast.error(t('waitlist.modal.errors.joinError'));
      }
    } catch (error) {
      console.error('Waitlist error:', error);
      toast.error(t('waitlist.modal.errors.generalError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">

        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="logo" width={32} height={32} className="object-contain" />
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'form' ? t('waitlist.modal.title.form') : t('waitlist.modal.title.success')}

            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-orange-500 mr-3 rounded-full"></span>
                  {t('waitlist.modal.sections.personalInfo.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.firstname.label')}
                    </label>
                    <input
                      type="text"
                      name="firstname"
                      value={formData.firstname}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder={t('booking.modal.fields.firstname.placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.lastname.label')}
                    </label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder={t('booking.modal.fields.lastname.placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.email.label')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder={t('booking.modal.fields.email.label')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.phone.label')}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder={t('booking.modal.fields.phone.placeholder')}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.company.label')}
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder={t('booking.modal.fields.company.placeholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isSubmitting ? t('waitlist.modal.buttons.processing') : t('waitlist.modal.buttons.join')}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('waitlist.modal.success.title')}</h3>

              <div className="bg-gray-50 rounded-xl p-6 text-left mb-6 ">
                <p className="text-gray-700 mb-3">
                  {t('waitlist.modal.success.thankYou')} {formData.firstname} {formData.lastname}
                </p>
                <p className="text-gray-600">
                  {t('waitlist.modal.success.notify')} <strong>{formData.email}</strong>
                </p>
              </div>



              <button
                onClick={onClose}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                {t('waitlist.modal.buttons.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
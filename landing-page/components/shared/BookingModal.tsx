'use client'
// components/BookingModal.tsx
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from "sonner"
import { useTranslation } from '@/context/LanguageContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  logo: string;
}

interface BookingFormData {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  company: string;
  preferred_date: string;
  preferred_time: string;
  additional_notes: string;
}

interface BookingResult {
  success: boolean;
  join_url?: string;
  message?: string;
}

export default function BookingModal({ isOpen, onClose, logo }: BookingModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    company: '',
    preferred_date: '',
    preferred_time: '',
    additional_notes: ''
  });
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const { t } = useTranslation()
  // Set minimum date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, preferred_date: today }));
  }, []);

  // Reset modal when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('form');
        setFormData({
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
          company: '',
          preferred_date: new Date().toISOString().split('T')[0],
          preferred_time: '',
          additional_notes: ''
        });
        setBookingResult(null);
      }, 300);
    }
  }, [isOpen]);

  const formatDateTimeForZoho = (date: string, time: string): string => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = monthNames[parseInt(dateParts[1]) - 1];
    const day = parseInt(dateParts[2]);

    return `${month} ${day}, ${year} ${time}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const preferredDatetime = formatDateTimeForZoho(
      formData.preferred_date,
      formData.preferred_time
    );

    const bookingData = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone,
      service_required: 'Advanced Demo - 60 min',
      additional_notes: formData.additional_notes,
      preferred_datetime: preferredDatetime
    };

    try {
      const response = await fetch('https://voxsun.com/api/new_booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result: BookingResult = await response.json();

      if (result.success) {
        setBookingResult(result);
        setStep('success');
      } else {
        toast.error(t('booking.modal.errors.bookingError'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(t('booking.modal.errors.generalError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Image src={logo} alt="logo" width={32} height={32} className="object-contain" />
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'form' ? t('booking.modal.title.form') : t('booking.modal.title.success')}
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

        {/* Content */}
        <div className="p-6">
          {step === 'form' ? (
            <div onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-orange-500 mr-3 rounded-full"></span>
                  {t('booking.modal.sections.personalInfo.title')}
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
                      placeholder={t('booking.modal.fields.email.placeholder')}
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

              {/* Appointment Preferences */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-orange-500 mr-3 rounded-full"></span>
                  {t('booking.modal.sections.dateTime.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.date.label')}
                    </label>
                    <input
                      type="date"
                      name={t('booking.modal.fields.date.label')}
                      value={formData.preferred_date}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.time.label')}
                    </label>
                    <select
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">{t('booking.modal.fields.time.placeholder')}</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="04:30 PM">04:30 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('booking.modal.fields.notes.label')}
                    </label>
                    <textarea
                      name="additional_notes"
                      value={formData.additional_notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                      placeholder={t('booking.modal.fields.notes.placeholder')}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isSubmitting ? t('booking.modal.buttons.processing') : t('booking.modal.buttons.confirm')}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mb-6">
                <svg className="w-20 h-20 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('booking.modal.success.title')}</h3>

              {bookingResult && (
                <div className="bg-gray-50 rounded-xl p-6 text-left mb-6 border-l-4 border-green-500">
                  <p className="mb-3">
                    <strong className="text-gray-700">{t('booking.modal.success.demoType')}</strong>
                    <span className="ml-2 text-gray-900">Advanced Demo - 60 min</span>
                  </p>
                  <p className="mb-3">
                    <strong className="text-gray-700">{t('booking.modal.success.date')}</strong>
                    <span className="ml-2 text-gray-900">{formData.preferred_date}</span>
                  </p>
                  <p className="mb-3">
                    <strong className="text-gray-700">{t('booking.modal.success.time')}</strong>
                    <span className="ml-2 text-gray-900">{formData.preferred_time}</span>
                  </p>
                  {bookingResult.join_url && (
                    <p>
                      <strong className="text-gray-700">{t('booking.modal.success.meetingLink')}</strong>
                      <a
                        href={bookingResult.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-orange-500 hover:text-orange-600 underline break-all"
                      >
                        {bookingResult.join_url}
                      </a>
                    </p>
                  )}
                </div>
              )}

              <p className="text-gray-600 mb-6">
                {t('booking.modal.success.emailSent')}
              </p>

              <button
                onClick={onClose}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                {t('booking.modal.buttons.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
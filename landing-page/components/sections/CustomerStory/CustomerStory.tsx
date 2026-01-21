'use client';

import { useState } from 'react';

import Image from 'next/image';
import { Section } from '@/components/ui/Section';
import { Icons } from '@/constants/icon-import';
import { Chip } from '@/components/ui/Chip';
import { Images } from '@/constants/images-import';

interface Testimonial {
  id: number;
  chip: string;
  rating: number;
  text: string;
  author: {
    name: string;
    position: string;
    company: string;
    image: string;
  };
}

export function CustomerStory() {
  const [activeSlide, setActiveSlide] = useState(0);

  // Données des témoignages
  const testimonials: Testimonial[] = [
    {
      id: 1,
      chip: 'Customer Story',
      rating: 5,
      text: 'Speed is everything in real estate. BoostMyDeal allowed us to contact leads instantly and qualify them before our agents step in.',
      author: {
        name: 'Mariana Lee',
        position: 'Sales Manager',
        company: 'Zohopediac',
        image: '/testimonials/mariana.jpg', // Remplace par ton chemin
      },
    },
    {
      id: 2,
      chip: 'Customer Story',
      rating: 5,
      text: 'The AI automation helped us close 40% more deals in the first quarter. The personalization is incredible.',
      author: {
        name: 'John Smith',
        position: 'CEO',
        company: 'TechCorp',
        image: '/testimonials/john.jpg',
      },
    },
    {
      id: 3,
      chip: 'Customer Story',
      rating: 5,
      text: 'Our team productivity increased dramatically. BoostMyDeal handles all the repetitive tasks automatically.',
      author: {
        name: 'Sarah Johnson',
        position: 'Marketing Director',
        company: 'GrowthLabs',
        image: '/testimonials/sarah.jpg',
      },
    },
  ];

  const currentTestimonial = testimonials[activeSlide];

  // Render des étoiles
  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: count }).map((_, i) => (
          <Icons.StarIcon key={i} size={18} fill="#F59E0B" className="text-yellow-500" />
        ))}
      </div>
    );
  };

  return (
    <Section id='customerStory' background="white" spacing="lg">
      <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-0 items-stretch">


        <div className="bg-orange-50 lg:rounded-l-3xl p-8 lg:p-12 flex flex-col justify-between">

          {/* Header */}
          <div>
            {/* Chip */}
            <div className="mb-6">
              <Chip icon={<Icons.UsersRoundIcon />} variant="default" size="sm">
                {currentTestimonial.chip}
              </Chip>
            </div>

            {/* Rating */}
            <div className="mb-6">
              {renderStars(currentTestimonial.rating)}
            </div>

            {/* Témoignage */}
            <blockquote className="text-2xl lg:text-3xl  text-gray-900 leading-relaxed mb-8">
              {currentTestimonial.text}
            </blockquote>
          </div>

          {/* Footer */}
          <div>
            {/* Auteur */}
            <div className="mb-6">
              <p className="text-lg font-semibold text-gray-900">
                — {currentTestimonial.author.name}
              </p>
              <p className="text-lg text-gray-600 mt-1">
                {currentTestimonial.author.position}, {currentTestimonial.author.company}
              </p>
            </div>

            {/* Navigation dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all duration-300
                    ${index === activeSlide
                      ? 'bg-main w-2.5'
                      : 'bg-gray-300 hover:bg-gray-400'
                    }
                  `}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#d5dcdc] lg:rounded-r-3xl overflow-hidden h-[400px] lg:h-auto relative">
          <div className="absolute inset-0 flex items-end justify-center">
            <Image src={Images.customerStory1} fill alt='' className='object-contain' />
          </div>
        </div>

      </div>
    </Section>
  );
}
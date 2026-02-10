'use client';

import { Accordion } from '@/components/shared/Accordion';
import { Chip } from '@/components/ui/Chip';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { useTranslation } from '@/context/LanguageContext';
import { useEffect, useState } from 'react';


interface FAQCategory {
  id: string;
  title: string;
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export default function FAQSection() {
  const [activeCategory, setActiveCategory] = useState('general');
  const { t } = useTranslation()
  // Données FAQ organisées par catégorie
  const faqCategories: FAQCategory[] = [
    {
      id: 'general',
      title: t('faq.categories.general.title'),
      questions: [
        {
          question: t('faq.categories.general.questions.whatIsBoostMyDeal.question'),
          answer: t('faq.categories.general.questions.whatIsBoostMyDeal.answer'),
        },
        {
          question: t('faq.categories.general.questions.whoIsBoostMyDealFor.question'),
          answer: t('faq.categories.general.questions.whoIsBoostMyDealFor.answer'),
        },
        {
          question: t('faq.categories.general.questions.isBoostMyDealCRM.question'),
          answer: t('faq.categories.general.questions.isBoostMyDealCRM.answer'),
        },
        {
          question: t('faq.categories.general.questions.whatProblemSolve.question'),
          answer: t('faq.categories.general.questions.whatProblemSolve.answer'),
        },
      ],
    },
    {
      id: 'ai-automation',
      title: t('faq.categories.aiAutomation.title'),
      questions: [
        {
          question: t('faq.categories.aiAutomation.questions.howDifferent.question'),
          answer: t('faq.categories.aiAutomation.questions.howDifferent.answer'),
        },
        {
          question: t('faq.categories.aiAutomation.questions.aiOperateAlone.question'),
          answer: t('faq.categories.aiAutomation.questions.aiOperateAlone.answer'),
        },
        {
          question: t('faq.categories.aiAutomation.questions.controlAISays.question'),
          answer: t('faq.categories.aiAutomation.questions.controlAISays.answer'),
        },
        {
          question: t('faq.categories.aiAutomation.questions.replaceSalesReps.question'),
          answer: t('faq.categories.aiAutomation.questions.replaceSalesReps.answer'),
        },
      ],
    },
    {
      id: 'lead-handling',
      title: t('faq.categories.leadHandling.title'),
      questions: [
        {
          question: t('faq.categories.leadHandling.questions.handleNewLeads.question'),
          answer: t('faq.categories.leadHandling.questions.handleNewLeads.answer'),
        },
        {
          question: t('faq.categories.leadHandling.questions.howFastRespond.question'),
          answer: t('faq.categories.leadHandling.questions.howFastRespond.answer'),
        },
        {
          question: t('faq.categories.leadHandling.questions.leadNoResponse.question'),
          answer: t('faq.categories.leadHandling.questions.leadNoResponse.answer'),
        },
        {
          question: t('faq.categories.leadHandling.questions.bookMeetingsAuto.question'),
          answer: t('faq.categories.leadHandling.questions.bookMeetingsAuto.answer'),
        },
        {
          question: t('faq.categories.leadHandling.questions.speakToHuman.question'),
          answer: t('faq.categories.leadHandling.questions.speakToHuman.answer'),
        },
      ],
    },
    {
      id: 'integrations',
      title: t('faq.categories.integrations.title'),
      questions: [
        {
          question: t('faq.categories.integrations.questions.integrateExistingTools.question'),
          answer: t('faq.categories.integrations.questions.integrateExistingTools.answer'),
        },
        {
          question: t('faq.categories.integrations.questions.howLongGetStarted.question'),
          answer: t('faq.categories.integrations.questions.howLongGetStarted.answer'),
        },
        {
          question: t('faq.categories.integrations.questions.changeWorkflows.question'),
          answer: t('faq.categories.integrations.questions.changeWorkflows.answer'),
        },
      ],
    },
    {
      id: 'smbs',
      title: t('faq.categories.smbs.title'),
      questions: [
        {
          question: t('faq.categories.smbs.questions.whyValuableForSMBs.question'),
          answer: t('faq.categories.smbs.questions.whyValuableForSMBs.answer'),
        },
        {
          question: t('faq.categories.smbs.questions.reduceDependencySDRs.question'),
          answer: t('faq.categories.smbs.questions.reduceDependencySDRs.answer'),
        },
      ],
    },
    {
      id: 'enterprise',
      title: t('faq.categories.enterprise.title'),
      questions: [
        {
          question: t('faq.categories.enterprise.questions.suitableForEnterprise.question'),
          answer: t('faq.categories.enterprise.questions.suitableForEnterprise.answer'),
        },
        {
          question: t('faq.categories.enterprise.questions.deployMultipleTeams.question'),
          answer: t('faq.categories.enterprise.questions.deployMultipleTeams.answer'),
        },
      ],
    },
    {
      id: 'security',
      title: t('faq.categories.security.title'),
      questions: [
        {
          question: t('faq.categories.security.questions.isSecure.question'),
          answer: t('faq.categories.security.questions.isSecure.answer'),
        },
        {
          question: t('faq.categories.security.questions.whoOwnsData.question'),
          answer: t('faq.categories.security.questions.whoOwnsData.answer'),
        },
        {
          question: t('faq.categories.security.questions.isAIBlackBox.question'),
          answer: t('faq.categories.security.questions.isAIBlackBox.answer'),
        },
        {
          question: t('faq.categories.security.questions.humansOverride.question'),
          answer: t('faq.categories.security.questions.humansOverride.answer'),
        },
      ],
    },
    {
      id: 'pricing',
      title: t('faq.categories.pricing.title'),
      questions: [
        {
          question: t('faq.categories.pricing.questions.howPriced.question'),
          answer: t('faq.categories.pricing.questions.howPriced.answer'),
        },
        {
          question: t('faq.categories.pricing.questions.reduceCosts.question'),
          answer: t('faq.categories.pricing.questions.reduceCosts.answer'),
        },
        {
          question: t('faq.categories.pricing.questions.whatResults.question'),
          answer: t('faq.categories.pricing.questions.whatResults.answer'),
        },
      ],
    },
    {
      id: 'support',
      title: t('faq.categories.support.title'),
      questions: [
        {
          question: t('faq.categories.support.questions.whatSupportIncluded.question'),
          answer: t('faq.categories.support.questions.whatSupportIncluded.answer'),
        },
        {
          question: t('faq.categories.support.questions.helpDesignWorkflows.question'),
          answer: t('faq.categories.support.questions.helpDesignWorkflows.answer'),
        },
      ],
    },
    {
      id: 'getting-started',
      title: t('faq.categories.gettingStarted.title'),
      questions: [
        {
          question: t('faq.categories.gettingStarted.questions.howGetStarted.question'),
          answer: t('faq.categories.gettingStarted.questions.howGetStarted.answer'),
        },
        {
          question: t('faq.categories.gettingStarted.questions.industrySpecific.question'),
          answer: t('faq.categories.gettingStarted.questions.industrySpecific.answer'),
        },
        {
          question: t('faq.categories.gettingStarted.questions.whoNotFor.question'),
          answer: t('faq.categories.gettingStarted.questions.whoNotFor.answer'),
        },
      ],
    },
  ];
  // Scroll vers une section
  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`faq-${categoryId}`);
    if (element) {
      const offset = 100; // Offset pour le header sticky
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setActiveCategory(categoryId);
  };

  // Détection de la section active au scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      for (const category of faqCategories) {
        const element = document.getElementById(`faq-${category.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(category.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main >
      <div className="text-center mb-12 bg-red-50/10  py-8 sm:py-12 h-min-screen">
        <div className="flex justify-center mb-6">
          <Chip variant="default" size="sm">
            Powered by Voxsun.com
          </Chip>
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          BoostMyDeal – Frequently Asked Questions
        </h1>

        <p className="text-base text-gray-600 max-w-2xl mx-auto">
          Answers to common questions to help you understand how BoostMyDeal
          works and how it fits into your sales workflow.
        </p>
      </div>

      <Container className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 max-w-7xl mx-auto">

        <aside className="lg:sticky lg:top-24 lg:self-start h-fit">
          <nav className="space-y-1">
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`
                  w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${activeCategory === category.id
                    ? 'bg-orange-50 text-main'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {category.title}
              </button>
            ))}
          </nav>
        </aside>
        <main className="space-y-12">
          {faqCategories.map((category) => (
            <div key={category.id} id={`faq-${category.id}`} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {category.title}
              </h2>
              <Accordion items={category.questions} />
            </div>
          ))}
        </main>
      </Container>
    </main>
  );
}
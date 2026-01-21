'use client';

import { Accordion } from '@/components/shared/Accordion';
import { Chip } from '@/components/ui/Chip';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
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

  // Données FAQ organisées par catégorie
  const faqCategories: FAQCategory[] = [
    {
      id: 'general',
      title: 'General',
      questions: [
        {
          question: 'What is BoostMyDeal?',
          answer: 'BoostMyDeal is an AI-driven sales operating system that manages the entire sales workflow — from lead engagement to meeting booking and CRM updates — automatically. It orchestrates calls, emails, SMS, follow-ups, and scheduling within one unified system.',
        },
        {
          question: 'Who is BoostMyDeal for?',
          answer: 'BoostMyDeal is designed for SMBs and enterprises that want faster response times, consistent execution, and predictable sales outcomes without adding more tools or headcount.',
        },
        {
          question: 'Is BoostMyDeal a CRM?',
          answer: 'No. BoostMyDeal does not replace your CRM. It operates on top of your existing CRM and keeps all activities, conversations, and deal updates synchronized in real time.',
        },
        {
          question: 'What problem does BoostMyDeal solve?',
          answer: 'BoostMyDeal eliminates fragmented sales tools and manual coordination by giving teams a single system that owns execution — ensuring no leads are dropped and every deal is followed through consistently.',
        },
      ],
    },
    {
      id: 'ai-automation',
      title: 'AI & Automation',
      questions: [
        {
          question: 'How is BoostMyDeal different from other AI sales tools?',
          answer: 'Most AI tools assist with isolated tasks like calling or emailing. BoostMyDeal manages the entire sales workflow end-to-end, coordinating every step of the deal automatically.',
        },
        {
          question: 'Does the AI operate on its own?',
          answer: 'BoostMyDeal operates within configurable workflows and guardrails. AI behavior is fully controlled and can be overridden by humans at any time.',
        },
        {
          question: 'Can we control what the AI says to prospects?',
          answer: 'Yes. Messaging, tone, timing, escalation rules, and approval thresholds are fully configurable to match your brand and compliance requirements.',
        },
        {
          question: 'Does BoostMyDeal replace sales reps or SDRs?',
          answer: 'No. BoostMyDeal removes repetitive execution work so sales teams can focus on high-value conversations, qualification, and closing.',
        },
      ],
    },
    {
      id: 'lead-handling',
      title: 'Lead Handling & Workflow',
      questions: [
        {
          question: 'How does BoostMyDeal handle new leads?',
          answer: 'As soon as a lead enters the system, BoostMyDeal initiates contact automatically and adapts follow-ups in real time based on engagement.',
        },
        {
          question: 'How fast does BoostMyDeal respond to leads?',
          answer: 'Immediately. BoostMyDeal initiates outreach as soon as a lead is received, significantly improving speed-to-lead.',
        },
        {
          question: "What happens if a lead doesn't respond?",
          answer: 'BoostMyDeal automatically triggers follow-ups across calls, email, and SMS according to your configured workflow.',
        },
        {
          question: 'Can BoostMyDeal book meetings automatically?',
          answer: 'Yes. BoostMyDeal can qualify leads, propose meeting times, and book meetings directly into your calendar.',
        },
        {
          question: 'What if a prospect wants to speak to a human?',
          answer: 'BoostMyDeal escalates conversations to a human instantly based on intent, rules, or manual intervention.',
        },
      ],
    },
    {
      id: 'integrations',
      title: 'Integrations & Deployment',
      questions: [
        {
          question: 'Does BoostMyDeal integrate with our existing tools?',
          answer: 'Yes. BoostMyDeal integrates with major CRMs and sales platforms and is designed to work alongside your existing stack rather than replace it.',
        },
        {
          question: 'How long does it take to get started?',
          answer: 'Most teams go live within days. Deployment time depends on workflow complexity and integration requirements.',
        },
        {
          question: 'Can workflows be changed after launch?',
          answer: 'Yes. Workflows are fully configurable and can be updated as your sales process evolves.',
        },
      ],
    },
    {
      id: 'smbs',
      title: 'SMBs',
      questions: [
        {
          question: 'Why is BoostMyDeal valuable for SMBs?',
          answer: 'BoostMyDeal allows SMBs to operate like a larger sales organization by improving response speed, consistency, and execution without increasing headcount.',
        },
        {
          question: 'Can BoostMyDeal reduce dependency on SDRs?',
          answer: 'Yes. BoostMyDeal automates repetitive SDR tasks, allowing teams to do more with fewer people.',
        },
      ],
    },
    {
      id: 'enterprise',
      title: 'Enterprise',
      questions: [
        {
          question: 'Is BoostMyDeal suitable for enterprise environments?',
          answer: 'Yes. BoostMyDeal is built for enterprise use with standardized workflows, centralized control, scalability, and enterprise-grade infrastructure.',
        },
        {
          question: 'Can BoostMyDeal be deployed across multiple teams?',
          answer: 'Yes. BoostMyDeal supports multi-team, multi-workflow deployments with centralized visibility and control.',
        },
      ],
    },
    {
      id: 'security',
      title: 'Security, Compliance & Trust',
      questions: [
        {
          question: 'Is BoostMyDeal secure?',
          answer: 'Yes. BoostMyDeal is built on enterprise-grade infrastructure with access controls, audit trails, and secure data handling.',
        },
        {
          question: 'Who owns the data?',
          answer: 'You do. All customer and sales data remain your property and stay synchronized with your CRM.',
        },
        {
          question: 'Is the AI a black box?',
          answer: 'No. BoostMyDeal provides transparency into actions taken by the system and full visibility into workflow execution.',
        },
        {
          question: 'Can humans override the AI?',
          answer: 'Yes. Sales teams can pause automation, intervene in conversations, or take over at any time.',
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing & ROI',
      questions: [
        {
          question: 'How is BoostMyDeal priced?',
          answer: 'Pricing is based on usage, scale, and workflow complexity. This allows SMBs to start small and enterprises to scale efficiently.',
        },
        {
          question: 'How does BoostMyDeal reduce costs?',
          answer: "By consolidating tools, reducing manual labor, lowering call costs through VoxSun's telecom infrastructure, and improving conversion efficiency.",
        },
        {
          question: 'What kind of results can we expect?',
          answer: 'Teams typically see faster speed-to-lead, higher contact rates, more meetings booked, and lower cost per deal.',
        },
      ],
    },
    {
      id: 'support',
      title: 'Support & Onboarding',
      questions: [
        {
          question: 'What support is included?',
          answer: 'BoostMyDeal includes onboarding, workflow configuration, training, and ongoing support to ensure long-term success.',
        },
        {
          question: 'Do you help design our workflows?',
          answer: 'Yes. Deployment begins with a workflow review to align BoostMyDeal with your sales process.',
        },
      ],
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      questions: [
        {
          question: 'How do we get started with BoostMyDeal?',
          answer: 'Getting started begins with a workflow assessment, followed by setup, testing, and deployment.',
        },
        {
          question: 'Is BoostMyDeal industry-specific?',
          answer: 'No. BoostMyDeal is industry-agnostic and works across B2B, B2C, inbound, outbound, and high-ticket sales models.',
        },
        {
          question: 'Who is BoostMyDeal not for?',
          answer: 'BoostMyDeal is not designed for teams that prefer manual execution or fragmented sales processes.',
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
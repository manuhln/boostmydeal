import React from 'react';
import { Container } from '../shared/Container';
import { Link } from 'wouter';
import { BoostMyLeadIcon } from '../BoostMyLeadIcon';
import { BoostMyLeadWhiteIcon } from '../BoostMyLeadWhiteIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { Images } from '@/utils/image';
import { AlertCircle } from 'lucide-react';

const OnboardingIntro = ({ onStart }: { onStart: () => void }) => {
  const { theme } = useTheme();

  return (
    <div className='bg-slate-50 h-screen dark:bg-background flex flex-col items-center justify-center' >
      <Container size='sm' >
        <header className="border-b border-border px-6 py-4 flex justify-between items-center">
          <div className="hidden lg:block">
            {theme === 'light' ? (
              <BoostMyLeadWhiteIcon width={70} height={70} className="hover:opacity-80 transition-opacity text-black" />
            ) : (
              <BoostMyLeadIcon width={50} height={50} className="hover:opacity-80 transition-opacity" />
            )}
          </div>
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Help / Docs
          </Link>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-normal text-foreground mb-4">
              Get Ready to Launch BoostMyDeal
            </h1>
            <div className="inline-block   px-4 py-2">
              <p className=" text-sm">
                This guide setup takes about{' '}
                <span className="font-semibold">15 minutes</span> and well configure AI agents to match your sales workflow.
              </p>
            </div>
            <div className="mt-3">
              <span className="inline-block  text-white text-xs font-medium px-3 py-1 rounded-full">
                5.37 × 61
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <img src={Images.wizardIntro1} alt="Business" className="rounded-lg" />
            <img src={Images.wizardIntro2} alt="Tools" className="rounded-lg" />
            <img src={Images.wizardIntro3} alt="AI" className="rounded-lg" />
          </div>


          <div className="bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800 dark:text-gray-200">
              You can pause and edit everything later. Nothing goes live without your confirmation.
            </p>
          </div>


          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onStart}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-3 rounded-lg transition-colors"
            >
              Start Setup
            </button>
            <button
              onClick={() => console.log('Skip for now')}
              className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
            >
              I'll gather this information later
            </button>
          </div>
        </main>
      </Container> </div>
  );
};


export default OnboardingIntro;
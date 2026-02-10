'use client'
import { ContentLayout } from "@/components/layout/ContentLayout";
import { BlogCard } from "@/components/shared/BlogCard";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Images } from "@/constants/images-import";
import { useTranslation } from '@/context/LanguageContext';
import Image from "next/image";
import Link from "next/link";

export function BlogSection() {
  const { t } = useTranslation()
  // Données des articles de blog
  const blogPosts = [
    {
      id: 1,
      image: Images.blog1,
      imagePosition: 'left' as const,
      title: t('blog.posts.aiSalesAgents.title'),
      description: t('blog.posts.aiSalesAgents.description'),
      link: '/blog/ai-sales-agents',
    },
    {
      id: 2,
      image: Images.blog2,
      imagePosition: 'right' as const,
      title: t('blog.posts.automatingSales.title'),
      description: t('blog.posts.automatingSales.description'),
      link: '/blog/automating-sales',
    },
    {
      id: 3,
      image: Images.blog3,
      imagePosition: 'right' as const,
      title: t('blog.posts.manualProcesses.title'),
      description: t('blog.posts.manualProcesses.description'),
      link: '/blog/manual-processes',
    },
  ];

  return (
    <Section id="resources" background="white" spacing="lg" className="relative overflow-hidden">
      <div className="relative z-10">
        {/* Header avec ContentLayout centered */}
        <div className="mb-8 md:mb-12 px-4">
          <ContentLayout
            layout="centered"
            chip={{ text: t('blog.chip'), variant: 'default' }}
            title={t('blog.section.title')}
            description={t('blog.section.description')} maxWidth="md"
          />
        </div>

        {/* Grid de blog cards */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="lg:row-span-2">
              {blogPosts[0] && (
                <Card
                  key={blogPosts[0].id}
                  variant="custom"
                  className="overflow-hidden hover:shadow-md transition-shadow  h-full flex flex-col border-gray-200 p-0"
                >

                  <div className="relative w-full aspect-video sm:aspect-[4/3] lg:aspect-video overflow-hidden ">
                    <Image
                      src={blogPosts[0].image}
                      alt={blogPosts[0].title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 50vw"
                      className="rounded object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col  px-2 pb-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-secondaryBlack leading-tight">
                      {blogPosts[0].title}
                    </h3>
                    <p className="text-secondaryGray text-sm sm:text-base leading-relaxed flex-1">
                      {blogPosts[0].description}
                    </p>
                    <Link
                      href={blogPosts[0].link}
                      className="inline-block text-sm font-medium text-main hover:text-main/80 transition-colors mt-0"
                    >
                      {t('blog.readMore')} →
                    </Link>
                  </div>
                </Card>
              )}
            </div>

            {/* Autres cartes - côté droit en vertical */}
            <div className="flex flex-col gap-4 md:gap-6">
              {blogPosts.slice(1).map((post) => (
                <BlogCard
                  key={post.id}
                  image={post.image}
                  title={post.title}
                  description={post.description}
                  link={post.link}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
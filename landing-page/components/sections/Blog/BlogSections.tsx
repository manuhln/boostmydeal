import { ContentLayout } from "@/components/layout/ContentLayout";
import { BlogCard } from "@/components/shared/BlogCard";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { Images } from "@/constants/images-import";
import Image from "next/image";
import Link from "next/link";

export function BlogSection() {
  // Données des articles de blog
  const blogPosts = [
    {
      id: 1,
      image: Images.blog1,
      imagePosition: 'left' as const,
      title: 'How AI Sales Agents Help Teams Respond Faster and Close More Deals',
      description: 'It helps streamline workflows, enhance customer interactions, and provide insights for smarter, data-driven decisions, driving business growth.',
      link: '/blog/ai-sales-agents',
    },
    {
      id: 2,
      image: Images.blog2,
      imagePosition: 'right' as const,
      title: 'Automating the Sales with AI',
      description: 'CRM streamlines workflows, automates tasks, and boosts team efficiency.',
      link: '/blog/automating-sales',
    },
    {
      id: 3,
      image: Images.blog3,
      imagePosition: 'right' as const,
      title: 'Why Manual Sales Processes Are Costing You Revenue',
      description: 'Enables better lead tracking, personalized communication, and faster deal closures.',
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
            chip={{ text: 'Blog', variant: 'default' }}
            title="Tips To Grow Business"
            description="Untitled is growing fast, and we are always looking for passionate, dynamic, and talented individuals to join our distributed team all around the world."
            maxWidth="md"
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
                      read more →
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
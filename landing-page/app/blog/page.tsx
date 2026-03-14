"use client";
import React, { useState, useEffect } from "react";

/* ─── Types ─── */
interface Post {
  id: number;
  date: string;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string; alt_text: string }>;
    author?: Array<{ name: string }>;
  };
}

/* ─── Helpers ─── */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const readingTime = (html: string) => {
  const words = stripHtml(html).split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";

const getThumb = (post: Post): string =>
  post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? PLACEHOLDER;

const getAuthor = (post: Post): string =>
  post._embedded?.author?.[0]?.name ?? "Editorial Team";

const CATEGORIES = ["Sales Tech", "General", "Data Science", "AI & ML", "Engineering"];
const getCategory = (index: number) => CATEGORIES[index % CATEGORIES.length];

/* ══════════════════════════════════════════
   SINGLE POST PAGE
══════════════════════════════════════════ */
const SinglePost = ({ post, onBack }: { post: Post; onBack: () => void }) => {
  const thumb = getThumb(post);

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="w-full h-[450px] overflow-hidden">
        <img
          src={thumb}
          alt={stripHtml(post.title.rendered)}
          className="w-full h-full object-cover rounded-b-xl"
        />
      </div>

      {/* Article body */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-24">


        {/* Title */}
        <h1
          className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Author row */}
        <div className="flex items-center gap-4 mb-10 pb-8 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-900 m-0">{getAuthor(post)}</p>
            <p className="text-xs text-gray-500 m-0">
              {formatDate(post.date)} · {readingTime(post.content.rendered)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div
          className="text-[17px] leading-[1.85] text-gray-700 prose max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          ← Back to Blog
        </button>
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="flex flex-col">
    <div className="w-full aspect-[16/10] rounded-xl mb-4 bg-gray-200 animate-pulse" />
    <div className="h-3 w-16 rounded bg-gray-200 animate-pulse mb-2" />
    <div className="h-5 w-[90%] rounded bg-gray-200 animate-pulse mb-3" />
    <div className="h-3 w-full rounded bg-gray-200 animate-pulse mb-2" />
    <div className="h-3 w-full rounded bg-gray-200 animate-pulse mb-2" />
    <div className="h-3 w-[70%] rounded bg-gray-200 animate-pulse" />
  </div>
);

/* ═══════════════════════════════════════════
   BLOG LIST PAGE
═══════════════════════════════════════════ */
const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    fetch("/api/blog?_embed=true")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load posts");
        return r.json();
      })
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const openPost = async (id: number) => {
    setLoadingPost(true);
    try {
      const r = await fetch(`/api/blog?id=${id}&_embed=true`);
      const data = await r.json();
      setSelectedPost(data);
    } catch {
      setError("Failed to load article");
    } finally {
      setLoadingPost(false);
    }
  };

  if (selectedPost) {
    return <SinglePost post={selectedPost} onBack={() => setSelectedPost(null)} />;
  }

  const featured = posts[0] ?? null;
  const rest = posts.slice(1);

  return (
    <>
      {/* Loading overlay for single post */}
      {loadingPost && (
        <div className="fixed inset-0 bg-white/75 flex items-center justify-center z-[200]">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin" />
        </div>
      )}

      {/* ══ HERO SECTION ══ */}
      <section className="py-12 mt-16 md:py-20 bg-gray-50" data-purpose="featured-post-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Featured Image — order-2 on mobile, order-1 on desktop */}
            <div className="order-2 lg:order-1">
              {loading ? (
                <div className="w-full h-[300px] md:h-[450px] rounded-xl bg-gray-200 animate-pulse" />
              ) : featured ? (
                <img
                  src={getThumb(featured)}
                  alt={stripHtml(featured.title.rendered)}
                  onClick={() => openPost(featured.id)}
                  className="rounded-xl shadow-xl object-cover w-full h-[300px] md:h-[450px] cursor-pointer"
                />
              ) : null}
            </div>

            {/* Featured Content — order-1 on mobile, order-2 on desktop */}
            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold tracking-wider uppercase rounded-full mb-4">
                Featured Analysis
              </span>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-10 w-[90%] rounded bg-gray-200 animate-pulse" />
                  <div className="h-10 w-[70%] rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-full rounded bg-gray-200 animate-pulse mt-4" />
                  <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-[60%] rounded bg-gray-200 animate-pulse" />
                  <div className="flex items-center gap-4 mt-6">
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
                    <div className="space-y-2">
                      <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                      <div className="h-3 w-36 rounded bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : featured ? (
                <>
                  <h1
                    className="text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-6"
                    dangerouslySetInnerHTML={{ __html: featured.title.rendered }}
                  />
                  <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                    {stripHtml(featured.excerpt.rendered)}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{getAuthor(featured)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(featured.date)} · {readingTime(featured.content.rendered)}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ARTICLE GRID ══ */}
      <section className="py-16 md:py-24" data-purpose="article-listing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Recent Articles</h2>
              <p className="text-gray-500 mt-2 text-sm">
                The latest insights from our engineering and sales teams.
              </p>
            </div>
            <div className="hidden md:flex gap-2">
              {["All", "AI & ML", "Sales Tech"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border-none cursor-pointer
                    ${activeFilter === f
                      ? "bg-gray-100 text-gray-900"
                      : "bg-transparent text-gray-600 hover:text-orange-600"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-red-500 py-12">⚠️ {error}</p>
          )}

          {/* Empty */}
          {!loading && !error && posts.length === 0 && (
            <p className="text-center text-gray-400 py-12">No articles found.</p>
          )}

          {/* Cards grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading
              ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
              : rest.map((post, idx) => (
                <article
                  key={post.id}
                  className="flex flex-col group cursor-pointer"
                  data-purpose="blog-card"
                  onClick={() => openPost(post.id)}
                >
                  {/* Thumbnail */}
                  <div className="overflow-hidden rounded-xl mb-4">
                    <img
                      src={getThumb(post)}
                      alt={stripHtml(post.title.rendered)}
                      className="w-full aspect-[16/10] object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Body */}
                  <div className="flex-grow">
                    <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">
                      {getCategory(idx)}
                    </span>
                    <h3
                      className="text-xl font-bold text-gray-900 mt-2 mb-3 leading-snug group-hover:text-orange-600 transition-colors"
                      dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                    />
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {stripHtml(post.excerpt.rendered)}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
                    <span className="text-xs font-semibold text-orange-600">Read More →</span>
                  </div>
                </article>
              ))}
          </div>

          {/* Pagination */}
          {!loading && posts.length > 0 && (
            <div className="mt-16 flex justify-center">
              <nav className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm cursor-pointer border transition-colors
                      ${n === 1
                        ? "bg-orange-600 text-white border-transparent"
                        : "bg-transparent text-gray-900 border-gray-200 hover:border-orange-600 hover:text-orange-600"
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Blog;
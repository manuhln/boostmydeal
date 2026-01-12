
import { Footer } from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Features from "@/components/sections/Features/Features";
import { Hero } from "@/components/sections/Hero/Hero";
import IndustryCase from "@/components/sections/IndustryCase/IndustryCase";
import { Partners } from "@/components/sections/Partners/Partners";
import { Plans } from "@/components/sections/Plans/Plans";
import Product from "@/components/sections/Product/Product";
import Solution from "@/components/sections/Solution/Solution";
import { WhyBoostMyDeal } from "@/components/sections/why/WhyBoostMyDeal";



export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Partners />
        <Product />
        <Solution />
        <Features />
        <IndustryCase />
        <Plans />
        <WhyBoostMyDeal />
      </main>
      <Footer />
    </>
  )
}
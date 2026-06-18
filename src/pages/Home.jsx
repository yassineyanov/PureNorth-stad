import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { WhyUs } from "@/components/WhyUs";
import { BookingForm } from "@/components/BookingForm";
import { Contact, Footer } from "@/components/Contact";

export default function Home() {
  return (
    <div className="bg-white">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <WhyUs />
        <BookingForm />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

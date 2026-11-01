import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = {
  question: string;
  answer: string;
};

const faqsData: FaqItem[] = [
  {
    question: "What material is used for this product?",
    answer:
      "Most of our products are made from 100% premium combed cotton or breathable cotton blends designed for everyday comfort and durability.",
  },
  {
    question: "How should I care for and wash this garment?",
    answer:
      "Machine wash warm with similar colors, do not bleach. Tumble dry on low heat or hang dry to preserve print vibrancy and fabric soft feel.",
  },
  {
    question: "Are the sizes true to standard sizing?",
    answer:
      "Yes, our sizing follows standard international retail measurements. You can also consult our Voice AI assistant anytime for personalized fit advice.",
  },
  {
    question: "Is this item unisex or gender-specific?",
    answer:
      "Many of our tops and t-shirts feature a versatile unisex regular fit, while tailored pieces specify men's or women's fit in their details.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 2-4 business days. Express next-day delivery options and free shipping are available on orders over $100.",
  },
  {
    question: "What is your return and exchange policy?",
    answer:
      "We offer a 30-day hassle-free return and exchange policy for unused items in their original packaging with tags attached.",
  },
];

const FaqContent = () => {
  return (
    <section>
      <h3 className="text-xl sm:text-2xl font-bold text-black mb-5 sm:mb-6">
        Frequently Asked Questions
      </h3>
      <Accordion type="single" collapsible>
        {faqsData.map((faq, idx) => (
          <AccordionItem key={idx} value={`item-${idx + 1}`}>
            <AccordionTrigger className="text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default FaqContent;

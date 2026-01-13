'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './FAQSection.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How does the free plan work?',
    answer: 'The free plan gives you 15,000 words to write with—perfect for short stories, essays, or trying out Scribo. You get unlimited projects and all core features. No credit card required.',
  },
  {
    question: 'What happens when I reach the word limit?',
    answer: 'You can still read and export your work, but you won\'t be able to add new words until you upgrade to Pro or delete some content. We\'ll notify you as you approach the limit.',
  },
  {
    question: 'Can I export my work?',
    answer: 'Yes! Pro users get additional export formats including Word (.docx). Your writing is always yours to take with you.',
  },
  {
    question: 'Is my writing private and secure?',
    answer: 'Absolutely. Your writing is encrypted and stored securely. We never share or use your content for any purpose. You own your work, and only you can access it.',
  },
  {
    question: 'Can I cancel my Pro subscription anytime?',
    answer: 'Yes, you can cancel anytime from your account settings. You\'ll keep Pro features until the end of your billing period, then automatically switch to the free plan.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee. If Scribo isn\'t right for you, just contact us within 30 days of your purchase for a full refund.',
  },
  {
    question: 'Can I collaborate with other writers?',
    answer: 'Collaboration features are on our roadmap! For now, Scribo is designed for individual writers. You can vote for collaboration features on our feedback board.',
  },
  {
    question: 'Does Scribo work offline?',
    answer: 'Scribo requires an internet connection to sync your work across devices. We\'re exploring offline capabilities for future updates.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.content}>
        <h2 className={styles.title}>Frequently asked questions</h2>
        <p className={styles.subtitle}>Everything you need to know about Scribo</p>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  size={20}
                  strokeWidth={1.5}
                  className={`${styles.chevron} ${openIndex === index ? styles.chevronOpen : ''}`}
                />
              </button>
              <div
                className={`${styles.faqAnswer} ${openIndex === index ? styles.faqAnswerOpen : ''}`}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { FileText, FolderTree, Network, Download, Focus, BarChart3 } from 'lucide-react';
import styles from './BentoFeatures.module.css';

const features = [
    {
        icon: FileText,
        title: 'Rich Text Editor',
        description: 'A clean writing environment with formatting, headings, lists, and everything you need.',
    },
    {
        icon: FolderTree,
        title: 'Project Organization',
        description: 'Keep chapters, notes, and research organized in a flexible sidebar structure.',
    },
    {
        icon: Network,
        title: 'Constellation View',
        description: 'Visualize your story structure and character relationships in an interactive map.',
    },
    {
        icon: Focus,
        title: 'Focus Mode',
        description: 'Block out distractions and concentrate on your writing with a minimal interface.',
    },
    {
        icon: Download,
        title: 'Export Anywhere',
        description: 'Export your work to Markdown, PDF, or plain text whenever you need it.',
    },
    {
        icon: BarChart3,
        title: 'Progress Tracking',
        description: 'Track your word count and writing streaks to stay motivated.',
    },
];

export default function BentoFeatures() {
    return (
        <section id="features" className={styles.featuresSection}>
            <div className={styles.header}>
                <h2 className={styles.title}>Everything you need to finish</h2>
                <p className={styles.subtitle}>Powerful tools designed for the modern author.</p>
            </div>

            <div className={styles.grid}>
                {features.map((feature) => (
                    <div key={feature.title} className={styles.card}>
                        <div className={styles.iconWrapper}>
                            <feature.icon size={24} strokeWidth={1.5} />
                        </div>
                        <h3 className={styles.cardTitle}>{feature.title}</h3>
                        <p className={styles.cardDescription}>{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

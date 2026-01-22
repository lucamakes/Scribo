'use client';

import { useState } from 'react';
import { X, FileText, BookOpen, Briefcase, Newspaper, Scroll, Sparkles } from 'lucide-react';
import IconButton from '@/components/IconButton/IconButton';
import Button from '@/components/Button/Button';
import styles from './TemplateModal.module.css';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: 'novel' | 'screenplay' | 'research' | 'blog' | 'essay' | 'blank';
  structure: TemplateFolder[];
}

export interface TemplateFolder {
  name: string;
  type: 'folder' | 'file';
  content?: string;
  children?: TemplateFolder[];
}

const templates: ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start with an empty project',
    icon: 'blank',
    structure: [],
  },
  {
    id: 'novel',
    name: 'Novel',
    description: 'Structure for writing a novel with chapters and character notes',
    icon: 'novel',
    structure: [
      {
        name: 'Chapters',
        type: 'folder',
        children: [
          { name: 'Chapter 1', type: 'file', content: '' },
          { name: 'Chapter 2', type: 'file', content: '' },
          { name: 'Chapter 3', type: 'file', content: '' },
        ],
      },
      {
        name: 'Characters',
        type: 'folder',
        children: [
          { name: 'Protagonist', type: 'file', content: '' },
          { name: 'Antagonist', type: 'file', content: '' },
        ],
      },
      {
        name: 'World Building',
        type: 'folder',
        children: [
          { name: 'Setting', type: 'file', content: '' },
          { name: 'Timeline', type: 'file', content: '' },
        ],
      },
      { name: 'Plot Outline', type: 'file', content: '' },
      { name: 'Notes', type: 'file', content: '' },
    ],
  },
];

const iconMap = {
  novel: BookOpen,
  screenplay: Scroll,
  research: Briefcase,
  blog: Newspaper,
  essay: FileText,
  blank: Sparkles,
};

export function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      onSelectTemplate(template);
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Choose a Template</h2>
          <IconButton onClick={onClose} title="Close">
            <X size={18} strokeWidth={1.5} />
          </IconButton>
        </header>

        <div className={styles.content}>
          <p className={styles.subtitle}>
            Start with a pre-built structure or create a blank project
          </p>

          <div className={styles.templateGrid}>
            {templates.map((template) => {
              const Icon = iconMap[template.icon];
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`${styles.templateCard} ${
                    selectedTemplate === template.id ? styles.templateCardSelected : ''
                  }`}
                >
                  <div className={styles.templateIcon}>
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <div className={styles.templateInfo}>
                    <div className={styles.templateName}>{template.name}</div>
                    <div className={styles.templateDescription}>{template.description}</div>
                  </div>
                  <div className={styles.radioButton}>
                    {selectedTemplate === template.id && (
                      <div className={styles.radioButtonInner} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <footer className={styles.footer}>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>
            Continue
          </Button>
        </footer>
      </div>
    </div>
  );
}

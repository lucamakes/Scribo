'use client';

import { useState, useCallback, type FormEvent, type ChangeEvent } from 'react';
import type { Project } from '@/types/project';
import { useAuth } from '@/lib/context/AuthContext';
import { projectService } from '@/lib/services/projectService';
import { itemService } from '@/lib/services/itemService';
import { BookOpen, Sparkles } from 'lucide-react';
import styles from './ProjectSetup.module.css';

interface TemplateFolder {
  name: string;
  type: 'folder' | 'file';
  content?: string;
  children?: TemplateFolder[];
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: 'novel' | 'blank';
  structure: TemplateFolder[];
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
  blank: Sparkles,
};

interface ProjectSetupProps {
  onCreateProject: (project: Project) => void;
  onClose?: () => void;
}

/**
 * Project creation screen component.
 * Creates project in Supabase and passes it to parent.
 */
export function ProjectSetup({ onCreateProject, onClose }: ProjectSetupProps) {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');
  const { user, loading: authLoading } = useAuth();

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (error) setError('');
  }, [error]);

  const createItemsFromTemplate = useCallback(async (
    projectId: string,
    structure: TemplateFolder[],
    parentId: string | null = null,
    orderOffset: number = 0
  ): Promise<void> => {
    for (let i = 0; i < structure.length; i++) {
      const item = structure[i];
      const result = await itemService.create(
        projectId,
        parentId,
        item.name,
        item.type,
        item.content || ''
      );

      if (result.success && item.type === 'folder' && item.children) {
        // Recursively create children
        await createItemsFromTemplate(projectId, item.children, result.data.id);
      }
    }
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please wait for authentication...');
      return;
    }

    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Project name must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await projectService.create({
        user_id: user.id,
        name: trimmedName,
      });

      if (!result.success) {
        setError((result as { success: false; error: string }).error);
        setLoading(false);
        return;
      }

      const project: Project = {
        id: result.data.id,
        name: result.data.name,
        createdAt: result.data.created_at,
      };

      // Create template structure if selected
      const template = templates.find(t => t.id === selectedTemplate);
      if (template && template.structure.length > 0) {
        await createItemsFromTemplate(project.id, template.structure);
      }

      onCreateProject(project);
    } catch (err) {
      setError('Failed to create project. Please try again.');
      console.error('Create project error:', err);
      setLoading(false);
    }
  }, [projectName, user, selectedTemplate, createItemsFromTemplate, onCreateProject]);

  if (authLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loading}>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h1 className={styles.title}>Create New Project</h1>
          <p className={styles.subtitle}>
            Choose a template and enter a name for your project
          </p>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Template</label>
            <div className={styles.templateGrid}>
              {templates.map((template) => {
                const Icon = iconMap[template.icon];
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`${styles.templateCard} ${
                      selectedTemplate === template.id ? styles.templateCardSelected : ''
                    }`}
                  >
                    <div className={styles.templateIcon}>
                      <Icon size={20} strokeWidth={1} />
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

          <div className={styles.field}>
            <label htmlFor="projectName" className={styles.label}>
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={handleChange}
              placeholder="My Project"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              autoFocus
              autoComplete="off"
              disabled={loading || !user}
            />
            {error && <span className={styles.error}>{error}</span>}
          </div>

          <button type="submit" className={styles.button} disabled={loading || !user}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </main>
  );
}

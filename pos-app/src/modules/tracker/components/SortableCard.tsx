import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const SortableCard: React.FC<SortableCardProps> = ({ id, children, className = '' }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''} ${className}`}
    >
      {/* Drag Handle */}
      <button
        aria-label="Drag card"
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded bg-surface border border-border shadow-sm text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {children}
    </div>
  );
};

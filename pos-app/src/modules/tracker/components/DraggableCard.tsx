import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableCardProps {
  id: string;
  index: number;
  children: React.ReactNode;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  className?: string;
}

export const DraggableCard = ({

  index,
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  className = ""
}: DraggableCardProps) => {
  const [draggedOver, setDraggedOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragging) {
      setDraggedOver(true);
      onDragOver(index);
    }
  };

  const handleDragLeave = () => {
    setDraggedOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);
    onDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedOver(false);
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`
        relative group cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${draggedOver && !isDragging ? 'scale-[1.02] shadow-lg' : ''}
        ${className}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="p-1 rounded bg-surface backdrop-blur-sm border border-border shadow-sm">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Drop Indicator */}
      {draggedOver && !isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5 pointer-events-none" />
      )}

      {children}
    </div>
  );
};
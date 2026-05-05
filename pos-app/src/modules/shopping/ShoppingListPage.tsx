import { useState, useRef, useEffect, FC } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { Plus, Check, Trash2, Repeat, ChevronDown, ChevronUp } from 'lucide-react';

import { useShoppingStore, ShoppingItem } from '@/store/useShoppingStore';

const ShoppingItemRow: FC<{
  item: ShoppingItem;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleRecurring: (id: string) => void;
}> = ({ item, onToggleComplete, onDelete, onToggleRecurring }) => {
  const x = useMotionValue(0);
  const controls = useAnimation();
  
  // Opacity of background actions based on drag
  const checkOpacity = useTransform(x, [0, 50], [0, 1]);
  const deleteOpacity = useTransform(x, [0, -50], [0, 1]);

  const handleDragEnd = async (e: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 80 || velocity > 500) {
      // Swipe Right -> Complete
      await controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } });
      onToggleComplete(item.id);
    } else if (offset < -80 || velocity < -500) {
      // Swipe Left -> Delete
      await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } });
      onDelete(item.id);
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="relative mb-3 group"
    >
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-surface-hover overflow-hidden">
        <motion.div style={{ opacity: checkOpacity }} className="flex items-center text-emerald-500">
          <Check size={20} />
        </motion.div>
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center text-red-500">
          <Trash2 size={20} />
        </motion.div>
      </div>

      {/* Foreground Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative bg-surface border border-border/50 rounded-xl p-4 flex items-center gap-4 shadow-sm z-10 touch-pan-y"
      >
        <button
          onClick={() => onToggleComplete(item.id)}
          className={`w-7 h-7 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
            item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border text-transparent hover:border-text-secondary'
          }`}
        >
          <Check size={16} strokeWidth={3} />
        </button>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={`text-[16px] font-medium truncate transition-all duration-200 ${item.completed ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
            {item.text}
          </span>
          {item.recurring && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
              <Repeat size={10} />
              Recurring
            </span>
          )}
        </div>

        <button
          onClick={() => onToggleRecurring(item.id)}
          className={`p-2 rounded-full transition-colors ${item.recurring ? 'text-accent bg-accent/10' : 'text-text-secondary/50 hover:text-text-primary hover:bg-surface-hover'}`}
        >
          <Repeat size={16} />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default function ShoppingListPage() {
  const { 
    items, 
    loading, 
    fetchItems, 
    addItem, 
    toggleComplete, 
    deleteItem, 
    toggleRecurring, 
    clearCompleted 
  } = useShoppingStore();

  const [inputValue, setInputValue] = useState('');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount and fetch data
  useEffect(() => {
    fetchItems();
    // Slight delay to ensure layout is ready
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    await addItem(inputValue.trim());
    setInputValue('');
  };

  const activeItems = items.filter((item) => !item.completed);
  const completedItems = items.filter((item) => item.completed);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Mobile-first constraints container */}
      <div className="w-full max-w-md mx-auto h-full flex flex-col relative sm:border-x sm:border-border/40 shadow-2xl bg-background">
        
        {/* Top Input Section (Sticky) */}
        <div className="sticky top-0 z-20 pt-8 pb-4 px-4 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <h1 className="text-2xl font-bold text-text-primary mb-4 tracking-tight">Shopping</h1>
          <form onSubmit={handleAddItem} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-secondary group-focus-within:text-accent transition-colors">
              <Plus size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add item..."
              className="w-full h-14 pl-12 pr-4 bg-surface border border-border/50 rounded-2xl text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 shadow-sm transition-all duration-300 text-[16px]"
            />
          </form>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth pb-32">
          {/* Loading State */}
          {loading && items.length === 0 && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && activeItems.length === 0 && completedItems.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4 text-text-secondary/50">
                <Plus size={32} />
              </div>
              <p className="text-text-primary font-medium text-lg">Add your first item</p>
              <p className="text-text-secondary text-sm mt-1">Keep track of your groceries easily</p>
            </motion.div>
          )}

          {/* Active Items */}
          <div className="mb-8">
            <AnimatePresence mode="popLayout">
              {activeItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggleComplete={toggleComplete}
                  onDelete={deleteItem}
                  onToggleRecurring={toggleRecurring}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed Items Section */}
          {completedItems.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="w-full flex items-center justify-between py-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Completed</span>
                  <span className="bg-surface-hover px-2 py-0.5 rounded-full text-xs">
                    {completedItems.length}
                  </span>
                </div>
                {isCompletedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {isCompletedExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={clearCompleted}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                      >
                        Clear completed
                      </button>
                    </div>
                    
                    <AnimatePresence mode="popLayout">
                      {completedItems.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 0.6, scale: 1 }}
                          exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
                          className="flex items-center gap-4 py-3 px-2 border-b border-border/30 last:border-0"
                        >
                          <button
                            onClick={() => toggleComplete(item.id)}
                            className="w-6 h-6 flex-shrink-0 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex items-center justify-center text-emerald-500/70 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                          
                          <span className="flex-1 text-[15px] text-text-secondary line-through truncate">
                            {item.text}
                          </span>
                          
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-text-secondary/40 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Fade Out Gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

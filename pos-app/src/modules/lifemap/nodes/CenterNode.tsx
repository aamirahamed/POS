import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';

const CenterNode = ({ data, selected }: NodeProps) => {
    return (
        <div className="relative flex-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={`
          w-32 h-32 rounded-full 
          bg-surface border-2 
          flex-center flex-col
          shadow-2xl shadow-accent/20
          transition-all duration-300
          ${selected ? 'border-accent scale-105' : 'border-border'}
        `}
            >
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {data.label as string}
                </span>
                <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl -z-10" />
            </motion.div>

            {/* Source handles for outgoing connections */}
            <Handle
                type="source"
                position={Position.Top}
                id="source-top"
                className="invisible"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="source-right"
                className="invisible"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="source-bottom"
                className="invisible"
            />
            <Handle
                type="source"
                position={Position.Left}
                id="source-left"
                className="invisible"
            />
        </div>
    );
};

export default memo(CenterNode);

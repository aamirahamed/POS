import { FC, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseNABCsv } from '@/utils/financeUtils';
import { useFinanceStore } from '@/store/useFinanceStore';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportState = 'idle' | 'parsing' | 'success' | 'error';

const ImportModal: FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  const { importTransactions, categoryCorrections } = useFinanceStore();

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please upload a CSV file from NAB.');
      setImportState('error');
      return;
    }

    setImportState('parsing');
    try {
      const text = await file.text();
      const parsed = parseNABCsv(text, categoryCorrections);
      if (parsed.length === 0) {
        setErrorMsg('No transactions found. Please check your CSV format.');
        setImportState('error');
        return;
      }
      importTransactions(parsed);
      setImportedCount(parsed.length);
      setImportState('success');
    } catch (e) {
      setErrorMsg('Failed to parse CSV. Please try again.');
      setImportState('error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setImportState('idle');
    setErrorMsg('');
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="import-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="import-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-[#1a2235] border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Import Transactions</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Upload your NAB transaction CSV</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                {importState === 'idle' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                        ${dragOver
                          ? 'border-emerald-400/60 bg-emerald-400/5'
                          : 'border-white/10 hover:border-white/25 hover:bg-white/3'
                        }
                      `}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <Upload size={24} className="text-emerald-400" />
                      </div>
                      <p className="text-white font-medium mb-1">Drop your CSV here</p>
                      <p className="text-slate-400 text-sm">or click to browse files</p>
                      <p className="text-slate-500 text-xs mt-3">Supports NAB transaction exports</p>
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleInputChange}
                    />

                    {/* Format hint */}
                    <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/6">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Export from <span className="text-white">NAB Internet Banking</span> → Accounts → Transaction history → Download CSV
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {importState === 'parsing' && (
                  <motion.div
                    key="parsing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-10 flex flex-col items-center gap-4"
                  >
                    <Loader2 size={36} className="text-emerald-400 animate-spin" />
                    <p className="text-white font-medium">Parsing transactions…</p>
                    <p className="text-slate-400 text-sm">Auto-categorising your spending</p>
                  </motion.div>
                )}

                {importState === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex flex-col items-center gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{importedCount} transactions imported</p>
                      <p className="text-slate-400 text-sm mt-1">Categories have been auto-assigned</p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      View Dashboard
                    </button>
                  </motion.div>
                )}

                {importState === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex flex-col items-center gap-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Import failed</p>
                      <p className="text-slate-400 text-sm mt-1">{errorMsg}</p>
                    </div>
                    <button
                      onClick={reset}
                      className="mt-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ImportModal;

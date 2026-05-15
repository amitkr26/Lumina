'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Smile, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface MessageInputProps {
  onSend: (content: string) => void;
  onMediaAttach?: (file: File) => void;
  onVoiceRecord?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onMediaAttach,
  onVoiceRecord,
  placeholder = 'Type a message...',
  className,
  disabled = false,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showEmoji && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showEmoji]);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    setShowEmoji(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: { emoji: string }) => {
    setValue((prev) => prev + emoji.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onMediaAttach) {
      onMediaAttach(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowMediaMenu(false);
  };

  return (
    <div className={className}>
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full right-4 mb-2 z-50"
          >
            <div className="relative">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2 p-3 border-t border-border bg-card">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMediaMenu(!showMediaMenu)}
            className="text-muted-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <AnimatePresence>
            {showMediaMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border bg-popover shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <Image className="h-4 w-4 text-muted-foreground" />
                  Photo
                </button>
                <button
                  onClick={() => {
                    onVoiceRecord?.();
                    setShowMediaMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted transition-colors border-t"
                >
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  Voice note
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
          />
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>

        <Button
          onClick={handleSend}
          size="icon"
          disabled={!value.trim() || disabled}
          className={value.trim() ? 'bg-primary' : 'bg-muted text-muted-foreground'}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

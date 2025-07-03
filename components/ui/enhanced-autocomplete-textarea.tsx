"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SyntaxHighlightedTextarea } from "./syntax-highlighted-textarea";

interface AutocompleteOption {
  value: string;
  label: string;
  type: "global" | "list" | "output";
  description?: string;
}

interface EnhancedAutocompleteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  options: AutocompleteOption[];
  triggerPattern?: RegExp;
  minChars?: number;
  maxSuggestions?: number;
  onVariableClick?: (variable: string) => void;
  disabled?: boolean;
  rows?: number;
}

export function EnhancedAutocompleteTextarea({
  value,
  onChange,
  placeholder,
  className,
  options,
  triggerPattern = /<<([^>]*)$/,
  minChars = 0,
  maxSuggestions = 8,
  onVariableClick,
  disabled = false,
  rows = 4,
  ...props
}: EnhancedAutocompleteTextareaProps) {
  // Add state for cursor position tracking
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerInfo, setTriggerInfo] = useState<{
    start: number;
    end: number;
    query: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get available variable names for syntax highlighting
  const availableVariables = options.map((option) => option.value);

  const getCaretPosition = useCallback(() => {
    const textarea = containerRef.current?.querySelector("textarea");
    if (!textarea) return 0;
    return textarea.selectionStart || 0;
  }, []);

  const updateSuggestions = useCallback(
    (inputValue: string, caretPos: number) => {
      const textBeforeCaret = inputValue.substring(0, caretPos);
      const match = textBeforeCaret.match(triggerPattern);

      if (match) {

        const query = match[1].toLowerCase();
        const triggerStart = caretPos - match[0].length + 2;

        if (query.length >= minChars) {
          const filteredOptions = options
            .filter((option) => {
              if (typeof option.label !== "string") return false;
              if (option.label.toLowerCase().includes(query)) return true;
              if (
                typeof option.value === "string" &&
                option.value.toLowerCase().includes(query)
              )
                return true;
              return false;
            })
            .slice(0, maxSuggestions);

          if (filteredOptions.length > 0) {
            setSuggestions(filteredOptions);
            setTriggerInfo({
              start: triggerStart,
              end: caretPos,
              query: match[1],
            });
        

            setSelectedIndex(0);
            setShowSuggestions(true);
            return;
          }
        }
      }

      setShowSuggestions(false);
      setTriggerInfo(null);
    },
    [options, triggerPattern, minChars, maxSuggestions]
  );

  // Handle input change and update suggestions
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    setTimeout(() => {
      const caretPos = getCaretPosition();
      updateSuggestions(newValue, caretPos);
    }, 0);
  };

  // Add cursor position change handler
  const handleCursorPositionChange = useCallback((position: number) => {
    setCursorPosition(position);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (option: AutocompleteOption) => {
    if (!triggerInfo) return;

    const beforeTrigger = value.substring(0, triggerInfo.start - 2);
    const afterCaret = value.substring(triggerInfo.end);
    const newValue = beforeTrigger + `<<${option.label}>>` + afterCaret;


    onChange(newValue);
    setShowSuggestions(false);

    setTimeout(() => {
      const textarea = containerRef.current?.querySelector("textarea");
      if (textarea) {
        const newCaretPos = beforeTrigger.length + option.label.length + 4;
        textarea.setSelectionRange(newCaretPos, newCaretPos);
        textarea.focus();
      }
    }, 0);
  };

  const handleClick = () => {
    setTimeout(() => {
      const caretPos = getCaretPosition();
      updateSuggestions(value, caretPos);
    }, 0);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const handleVariableClick = (variable: string) => {
    onVariableClick?.(variable);
  };

  const getSuggestionPosition = () => {
    if (!containerRef.current || !triggerInfo) return { top: 0, left: 0 };

    const container = containerRef.current;
    const textarea = container.querySelector("textarea");
    if (!textarea) return { top: 0, left: 0 };

    const rect = container.getBoundingClientRect();
    return {
      top: rect.bottom + 5,
      left: rect.left,
    };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "global":
        return "bg-blue-100 text-blue-800";
      case "list":
        return "bg-green-100 text-green-800";
      case "output":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const position = showSuggestions
    ? getSuggestionPosition()
    : { top: 0, left: 0 };


  return (
    <div ref={containerRef} className="relative">
      <div
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onBlur={handleBlur}
        tabIndex={0}
        className="focus:outline-none"
      >
        <SyntaxHighlightedTextarea
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
          availableVariables={availableVariables.map((v) => v.label ?? v.name)}
          onVariableClick={handleVariableClick}
          onCursorPositionChange={handleCursorPositionChange}
          disabled={disabled}
          rows={rows}
          {...props}
        />
      </div>

      {showSuggestions && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-64"
          style={{
            top: "100%", // Just below the textarea
            left: 0,
          }}
        >
          <div className="p-2 text-xs text-gray-500 border-b border-gray-100">
            Variables (use ↑↓ to navigate, Enter to select)
          </div>
          {suggestions.map((option, index) => (
            <div
              key={`${option.type}-${option.value}`}
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-b-0",
                index === selectedIndex && "bg-blue-50 border-blue-100"
              )}
              onClick={() => selectSuggestion(option)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {option.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${getTypeColor(
                      option.type
                    )}`}
                  >
                    {option.type}
                  </span>
                </div>
                {option.description && (
                  <div
                    className="text-sm text-gray-500 truncate mt-1"
                    title={option.description}
                  >
                    {option.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


import React, { useEffect, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { analyzeCode } from '../services/typeChecker';

interface HapfEditorProps {
  value: string;
  onChange: (value: string) => void;
  failedModuleName?: string | null;
}

const HapfEditor: React.FC<HapfEditorProps> = ({ value, onChange, failedModuleName }) => {
  const monaco = useMonaco();

  const handleEditorDidMount = useCallback(() => {
    if (!monaco) return;

    // 1. Register Language if not exists
    if (!monaco.languages.getLanguages().some(l => l.id === 'hapf')) {
      monaco.languages.register({ id: 'hapf' });

      // 2. Syntax Highlighting (Monarch Tokenizer)
      monaco.languages.setMonarchTokensProvider('hapf', {
        tokenizer: {
          root: [
            // Keywords
            [/\b(module|pipeline|package|type|struct|contract|runtime|instructions|meta|governance|env)\b/, 'keyword.decl'],
            [/\b(run|let|if|else|loop|return|io|input|output)\b/, 'keyword.flow'],
            
            // Types
            [/\b(String|Int|Float|Bool|UUID|Date|Blob|Object|List|Map|Enum|Stream|JSON)\b/, 'type'],

            // Properties/Keys (e.g. strategy:)
            [/\b[a-z_][\w]*:/, 'key'],

            // Strings
            [/"/,  { token: 'string.quote', bracket: '@open', next: '@string' }],
            
            // Comments
            [/#.*$/, 'comment'],
            
            // Numbers
            [/\b\d+(\.\d+)?\b/, 'number'],
            
            // Identifiers (fallback)
            [/[a-zA-Z_][\w]*/, 'identifier'],
          ],
          string: [
            [/[^\\"]+/,  'string'],
            [/\\./,      'string.escape'],
            [/"/,        { token: 'string.quote', bracket: '@close', next: '@pop' }]
          ]
        }
      });

      // 3. Language Configuration (Brackets, Comments)
      monaco.languages.setLanguageConfiguration('hapf', {
        comments: {
          lineComment: '#',
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
        ]
      });

      // 4. Auto-Completion Provider (DYNAMIC)
      monaco.languages.registerCompletionItemProvider('hapf', {
        triggerCharacters: ['(', '{', ' ', '.', '"'],
        provideCompletionItems: (model, position) => {
          const fullText = model.getValue();
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          };

          const suggestions: any[] = [];
          
          // Context Analysis
          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeCursor = lineContent.substring(0, position.column - 1);

          // A. Argument Completion: run moduleName(|) or run moduleName({ | })
          // Regex lookbehind is limited, so we parse basic structure
          const runMatch = /run\s+([\w\.]+)\s*\(/.exec(textBeforeCursor);
          const insideRunParams = !!runMatch;
          
          if (insideRunParams && runMatch) {
             const calledModuleName = runMatch[1];
             // Find definition of this module
             const moduleDefRegex = new RegExp(`module\\s+"${calledModuleName}"\\s*\\{([\\s\\S]*?)\\}`, 'm');
             const defMatch = moduleDefRegex.exec(fullText);
             
             if (defMatch) {
                 const moduleBody = defMatch[1];
                 // Find contract -> input
                 const contractMatch = /contract\s*:\s*\{([\s\S]*?)\}/.exec(moduleBody);
                 if (contractMatch) {
                     const contractBody = contractMatch[1];
                     // Find input block: input: { key: Type } OR input: Type
                     const inputBlockMatch = /input\s*:\s*\{([^}]*)\}/.exec(contractBody);
                     
                     if (inputBlockMatch) {
                        const inputContent = inputBlockMatch[1];
                        // Extract keys: key: Type
                        const keyRegex = /([a-zA-Z0-9_]+)\s*:/g;
                        let keyMatch;
                        while ((keyMatch = keyRegex.exec(inputContent)) !== null) {
                            const argName = keyMatch[1];
                            suggestions.push({
                                label: argName,
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: `${argName}: `,
                                documentation: `Argument from ${calledModuleName} contract`,
                                range: range
                            });
                        }
                     }
                 }
             }
          }

          // B. Module Name Completion (after 'run ')
          if (textBeforeCursor.trim().endsWith('run')) {
             const moduleRegex = /module\s+"([^"]+)"/g;
             let match;
             while ((match = moduleRegex.exec(fullText)) !== null) {
                 suggestions.push({
                     label: match[1],
                     kind: monaco.languages.CompletionItemKind.Function,
                     insertText: `${match[1]}(`,
                     documentation: 'Defined Module',
                     range: range
                 });
             }
          }

          // C. Standard Snippets (only if not in specific context)
          if (!insideRunParams) {
              suggestions.push(
                {
                  label: 'module',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: 'module "${1:name}" {\n  contract: {\n    input: $2\n    output: $3\n  }\n  instructions: {\n    system_template: "$4"\n  }\n}',
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: 'Define a new execution module',
                  range
                },
                {
                  label: 'pipeline',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: 'pipeline "${1:name}" {\n  $0\n}',
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: 'Define a new pipeline workflow',
                  range
                },
                {
                  label: 'run',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: 'run ${1:module}(${2:args})',
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: 'Execute a module',
                  range
                }
              );
          }

          return { suggestions };
        }
      });
    }

    // 5. Define Custom Theme
    monaco.editor.defineTheme('hapf-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.decl', foreground: '#8b5cf6', fontStyle: 'bold' }, // hapf-accent
        { token: 'keyword.flow', foreground: '#f59e0b' }, // hapf-warning
        { token: 'type', foreground: '#3b82f6' }, // hapf-primary
        { token: 'string', foreground: '#10b981' }, // hapf-success
        { token: 'comment', foreground: '#52525b', fontStyle: 'italic' }, // hapf-muted
        { token: 'key', foreground: '#e4e4e7' }, // hapf-text
        { token: 'identifier', foreground: '#a1a1aa' }, 
      ],
      colors: {
        'editor.background': '#0d0d10',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#18181b',
        'editorCursor.foreground': '#3b82f6',
        'editorWhitespace.foreground': '#27272a',
        'editor.selectionBackground': '#3b82f633',
        'editorLineNumber.foreground': '#52525b'
      }
    });

    // Set Theme
    monaco.editor.setTheme('hapf-dark');

  }, [monaco]);

  // Validation Logic + Static Analysis + Runtime Error Highlighting
  useEffect(() => {
    if (!monaco || !value) return;

    const validate = () => {
        const markers: any[] = [];
        const lines = value.split('\n');
        
        let openBraces = 0;

        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const trimmed = line.trim();
            
            // 1. Syntax: Brace Checking
            for (let char of line) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
            }

            // 2. Syntax: Keyword usage checks
            if (trimmed.startsWith('module') && !trimmed.includes('"')) {
                 markers.push({
                    startLineNumber: lineNum,
                    startColumn: 1,
                    endLineNumber: lineNum,
                    endColumn: line.length + 1,
                    message: "Module definition requires a name in quotes: module \"name\" {",
                    severity: 8 // Error
                 });
            }
            if (trimmed.startsWith('pipeline') && !trimmed.includes('"')) {
                 markers.push({
                    startLineNumber: lineNum,
                    startColumn: 1,
                    endLineNumber: lineNum,
                    endColumn: line.length + 1,
                    message: "Pipeline definition requires a name in quotes: pipeline \"name\" {",
                    severity: 8 // Error
                 });
            }

            // 3. Runtime Error Highlighting
            if (failedModuleName) {
                // Heuristic: Find line calling the failed module
                // Covers: "run module" or "run module("
                if (line.includes(`run ${failedModuleName}`) || line.includes(`run ${failedModuleName.replace(/^mod-/, '')}`)) {
                    markers.push({
                        startLineNumber: lineNum,
                        startColumn: 1,
                        endLineNumber: lineNum,
                        endColumn: line.length + 1,
                        message: `RUNTIME ERROR: Module '${failedModuleName}' crashed during execution. Check logs for details.`,
                        severity: 8 // Error
                    });
                }
            }
        });

        if (openBraces !== 0) {
            markers.push({
                startLineNumber: lines.length,
                startColumn: 1,
                endLineNumber: lines.length,
                endColumn: 1,
                message: openBraces > 0 ? "Missing closing brace '}'" : "Unexpected extra '}'",
                severity: 8 // Error
            });
        }

        // 4. Static Semantic Analysis (Type Checking)
        const semanticDiagnostics = analyzeCode(value);
        semanticDiagnostics.forEach(d => {
            markers.push({
                startLineNumber: d.startLineNumber,
                startColumn: d.startColumn,
                endLineNumber: d.endLineNumber,
                endColumn: d.endColumn,
                message: d.message,
                severity: d.severity
            });
        });

        const model = monaco.editor.getModels()[0];
        if (model) {
            monaco.editor.setModelMarkers(model, 'hapf-validator', markers);
        }
    };

    // Debounce validation slightly
    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);

  }, [value, monaco, failedModuleName]);

  useEffect(() => {
    handleEditorDidMount();
  }, [handleEditorDidMount]);

  return (
    <Editor
      height="100%"
      defaultLanguage="hapf"
      value={value}
      theme="hapf-dark"
      onChange={(val) => onChange(val || '')}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'JetBrains Mono, monospace',
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'all',
      }}
    />
  );
};

export default HapfEditor;

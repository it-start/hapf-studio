import React, { useEffect, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface HapfEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const HapfEditor: React.FC<HapfEditorProps> = ({ value, onChange }) => {
  const monaco = useMonaco();

  const handleEditorDidMount = useCallback(() => {
    if (!monaco) return;

    // 1. Register Language
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

      // 4. Auto-Completion Provider
      monaco.languages.registerCompletionItemProvider('hapf', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'module',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'module "${1:name}" {\n  contract: {\n    input: $2\n    output: $3\n  }\n  instructions: {\n    system_template: "$4"\n  }\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a new execution module'
            },
            {
              label: 'pipeline',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'pipeline "${1:name}" {\n  $0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a new pipeline workflow'
            },
            {
              label: 'run',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'run ${1:module}(${2:args})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Execute a module'
            },
            {
              label: 'type',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'type ${1:Name} struct {\n  $2\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a custom data structure'
            }
          ];
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

  // Validation Logic (Simulated Parser)
  useEffect(() => {
    if (!monaco || !value) return;

    const validate = () => {
        const markers: any[] = [];
        const lines = value.split('\n');
        
        let openBraces = 0;

        lines.forEach((line, i) => {
            const lineNum = i + 1;
            
            // Brace Checking
            for (let char of line) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
            }

            // Keyword usage checks
            const trimmed = line.trim();
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

        const model = monaco.editor.getModels()[0];
        if (model) {
            monaco.editor.setModelMarkers(model, 'hapf-validator', markers);
        }
    };

    // Debounce validation slightly
    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);

  }, [value, monaco]);

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
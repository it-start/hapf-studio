import React from 'react';

interface CodeBlockProps {
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  // Simple syntax highlighting via regex splitting
  const renderCode = () => {
    const parts = code.split(/(".*?"|\b(?:module|pipeline|type|struct|contract|runtime|instructions|meta|governance|run|let|if|else)\b|[{}\[\](),:])/g);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      if (part.match(/^".*"$/)) {
        return <span key={index} className="text-green-400">{part}</span>;
      }
      if (['module', 'pipeline', 'type', 'struct', 'contract', 'runtime', 'instructions', 'meta', 'governance', 'run', 'let', 'if', 'else'].includes(part)) {
        return <span key={index} className="text-hapf-accent font-bold">{part}</span>;
      }
      if (['{', '}', '[', ']', '(', ')', ',', ':'].includes(part)) {
        return <span key={index} className="text-hapf-muted">{part}</span>;
      }
      return <span key={index} className="text-hapf-text">{part}</span>;
    });
  };

  return (
    <pre className="font-mono text-sm leading-relaxed p-4 h-full overflow-auto whitespace-pre-wrap">
      {renderCode()}
    </pre>
  );
};

export default CodeBlock;

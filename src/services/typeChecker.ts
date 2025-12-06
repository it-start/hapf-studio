
export interface HapfDiagnostic {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number; // 8 = Error, 4 = Warning
}

/**
 * Performs static analysis on HAPF code to detect semantic errors.
 * Checks for:
 * 1. Undefined modules in 'run' statements.
 * 2. Undefined variables in function arguments.
 * 3. Scope validity within pipelines.
 */
export const analyzeCode = (code: string): HapfDiagnostic[] => {
  const diagnostics: HapfDiagnostic[] = [];
  const lines = code.split('\n');

  // 1. First Pass: Gather Definitions (Hoisting)
  const declaredModules = new Set<string>();
  
  // Standard System Modules (implicitly available)
  declaredModules.add('io.write_file');
  declaredModules.add('io.write_output');
  declaredModules.add('io.read_logs');
  declaredModules.add('io.read_fs');
  declaredModules.add('io.write_fs');
  
  // Regex to find declarations
  const moduleDeclRegex = /module\s+"([^"]+)"/g;
  let match;
  while ((match = moduleDeclRegex.exec(code)) !== null) {
      declaredModules.add(match[1]);
  }

  // 2. Second Pass: Analyze Usage
  let inPipeline = false;
  let pipelineScope = new Set<string>();
  let braceDepth = 0;
  let pipelineStartDepth = 0;

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return; // Skip comments/empty

    // Track braces to handle scope nesting
    // Naive counting (ignoring braces in strings)
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    
    // Check Pipeline Start
    if (trimmed.startsWith('pipeline')) {
        inPipeline = true;
        pipelineScope = new Set<string>();
        pipelineScope.add('input'); // Global input object
        pipelineStartDepth = braceDepth;
    }

    const currentDepth = braceDepth;
    braceDepth += openBraces - closeBraces;

    if (inPipeline) {
        // Check if we exited pipeline
        if (braceDepth <= pipelineStartDepth && closeBraces > 0 && currentDepth > pipelineStartDepth) {
            inPipeline = false;
            return;
        }

        // A. Capture 'let' variables
        // Syntax: let varName = ...
        const letMatch = /let\s+([a-zA-Z_]\w*)\s*=/.exec(line);
        if (letMatch) {
            pipelineScope.add(letMatch[1]);
        }

        // B. Capture 'arrow' variables (e.g. source -> target)
        // If 'source' is an inferred variable name, we should add it? 
        // HAPF Diagram logic infers these, but strictly speaking 'let' is safer.
        // For type checking, we'll assume strict 'let' usage for variables.

        // C. Validate 'run module(...)'
        // Syntax: run moduleName(...)
        const runMatch = /\brun\s+([a-zA-Z0-9_\.]+)\s*\(/.exec(line);
        if (runMatch) {
            const moduleName = runMatch[1];
            const nameStartCol = line.indexOf(moduleName) + 1;

            // Check Module Existence
            // Allow io.* as generic if not strictly defined above, but we added standard ones.
            if (!declaredModules.has(moduleName)) {
                 diagnostics.push({
                    startLineNumber: lineNum,
                    startColumn: nameStartCol,
                    endLineNumber: lineNum,
                    endColumn: nameStartCol + moduleName.length,
                    message: `Undefined module '${moduleName}'. Ensure it is defined with 'module "${moduleName}"'.`,
                    severity: 8
                 });
            }

            // Check Arguments (Basic Variable Scope Check)
            const openParen = line.indexOf('(', nameStartCol);
            const closeParen = line.lastIndexOf(')');
            
            if (openParen !== -1 && closeParen !== -1) {
                const argsStr = line.substring(openParen + 1, closeParen);
                
                // Tokenize potential identifiers
                // Regex matches words that could be variables
                const tokenRegex = /([a-zA-Z_][\w\.]*)/g;
                let tokenMatch;
                while ((tokenMatch = tokenRegex.exec(argsStr)) !== null) {
                    const word = tokenMatch[1];
                    const idx = tokenMatch.index;
                    
                    // Filter out object keys (e.g. "key:")
                    const charAfter = argsStr[idx + word.length];
                    if (charAfter === ':') continue;

                    // Handle "obj.prop" -> check "obj"
                    const rootVar = word.split('.')[0];

                    // Ignore literals and keywords
                    if (['true', 'false', 'null', 'input'].includes(rootVar)) continue;
                    if (!isNaN(parseFloat(rootVar))) continue; // Number

                    // Check if identifier is in scope
                    if (!pipelineScope.has(rootVar)) {
                        // Ensure it's not inside a string
                        // Naive check: count quotes before it in the full line
                        const fullLineIdx = openParen + 1 + idx;
                        const textBefore = line.substring(0, fullLineIdx);
                        const quoteCount = (textBefore.match(/"/g) || []).length;
                        
                        if (quoteCount % 2 === 0) { // Even quotes = outside string
                            diagnostics.push({
                                startLineNumber: lineNum,
                                startColumn: fullLineIdx + 1,
                                endLineNumber: lineNum,
                                endColumn: fullLineIdx + 1 + word.length,
                                message: `Undefined variable '${rootVar}'.`,
                                severity: 8
                            });
                        }
                    }
                }
            }
        }
    }
  });

  return diagnostics;
};

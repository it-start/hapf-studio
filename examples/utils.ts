

export interface HapfExample {
  name: string;
  code: string;
  input: string;
}

/**
 * Helper to enforce structure and handle JSON formatting automatically.
 * @param name The display name of the pipeline.
 * @param code The raw HAPF source code.
 * @param input The raw JavaScript object to be stringified as JSON input.
 */
export const defineSpec = (name: string, code: string, input: object): HapfExample => ({
  name,
  code: code.trim(),
  input: JSON.stringify(input, null, 2)
});

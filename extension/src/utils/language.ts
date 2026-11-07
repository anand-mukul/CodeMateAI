/**
 * CodeMate AI — Programming Language Normalization Utility
 * 
 * Provides unified, robust language normalization across all frontend components,
 * eliminating typos (such as 'cp+') and ensuring seamless API schema compatibility.
 */

export type CanonicalLanguage = 'cpp' | 'python' | 'java' | 'c' | 'javascript' | 'go';

/**
 * Normalizes any freeform or platform language string to a canonical backend language id.
 * Handles variants like "C++", "c++", "cp+", "c+", "C++20", "Python 3", "PyPy", etc.
 */
export function normalizeLanguage(lang?: string | null): CanonicalLanguage {
  if (!lang) return 'cpp';
  const clean = lang.trim().toLowerCase();

  // C++ variants
  if (
    clean.includes('c++') ||
    clean.includes('cpp') ||
    clean.includes('cp+') ||
    clean.includes('c+') ||
    clean.includes('cplusplus') ||
    clean.includes('c_cpp') ||
    clean.startsWith('c++') ||
    clean.startsWith('cpp')
  ) {
    return 'cpp';
  }

  // Python variants
  if (clean.includes('python') || clean.includes('py') || clean.includes('pypy')) {
    return 'python';
  }

  // Java variants (must not match javascript)
  if (clean.includes('java') && !clean.includes('javascript')) {
    return 'java';
  }

  // JavaScript / TypeScript variants
  if (
    clean.includes('javascript') ||
    clean.includes('typescript') ||
    clean.includes('js') ||
    clean.includes('ts') ||
    clean.includes('node')
  ) {
    return 'javascript';
  }

  // C language
  if (clean === 'c' || clean.startsWith('c ') || clean.includes('(gcc)')) {
    return 'c';
  }

  // Go variants
  if (clean.includes('go') || clean.includes('golang')) {
    return 'go';
  }

  // Fallback default
  return 'cpp';
}

/**
 * Infers the target file name from code declarations (Java, React/TypeScript, Python)
 */
export function inferTargetFilename(code: string, currentLang?: string): string | null {
  if (!code) return null;

  // Java: public class StudentService / class CollegeApp
  const javaMatch = code.match(/(?:public\s+)?(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)/);
  if (javaMatch && javaMatch[1]) {
    return `${javaMatch[1]}.java`;
  }

  // React / TypeScript: export default function App / const Navbar: React.FC
  const reactMatch = code.match(
    /(?:export\s+default\s+(?:function|class)\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*:\s*React\.FC)/
  );
  const reactName = reactMatch ? reactMatch[1] || reactMatch[2] : null;
  if (reactName) {
    return `${reactName}.tsx`;
  }

  // Python: class UserService -> user_service.py
  const pyMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
  if (pyMatch && pyMatch[1] && (currentLang || '').toLowerCase().includes('py')) {
    const snake = pyMatch[1].replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    return `${snake}.py`;
  }

  return null;
}

/**
 * Returns user-facing capitalized display label (e.g., 'C++', 'Python', 'Java')
 */
export function getLanguageDisplayName(lang?: string | null): string {
  const canonical = normalizeLanguage(lang);
  switch (canonical) {
    case 'cpp':
      return 'C++';
    case 'python':
      return 'Python';
    case 'java':
      return 'Java';
    case 'c':
      return 'C';
    case 'javascript':
      return 'JavaScript';
    case 'go':
      return 'Go';
    default:
      return 'C++';
  }
}

/**
 * Returns standard file extension for the given language
 */
export function getLanguageExtension(lang?: string | null): string {
  const canonical = normalizeLanguage(lang);
  switch (canonical) {
    case 'cpp':
      return 'cpp';
    case 'python':
      return 'py';
    case 'java':
      return 'java';
    case 'c':
      return 'c';
    case 'javascript':
      return 'js';
    case 'go':
      return 'go';
    default:
      return 'cpp';
  }
}


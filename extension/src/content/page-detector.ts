import { ProblemContext } from '../types/problem';
import { ExampleCaseDTO } from '../types/ai';

export class PageDetector {
  /**
   * Checks if current page URL is a supported CodeChef problem/practice page
   */
  public static isCodeChef(): boolean {
    return window.location.hostname.includes('codechef.com');
  }

  public static isSupportedPracticePage(): boolean {
    if (!this.isCodeChef()) return false;
    const path = window.location.pathname;
    // Practice problems: /problems/CODE or course problems /.../CODE
    return path.includes('/problems/') || path.includes('/practice/') || path.includes('/submit/');
  }

  /**
   * Extracts clean text from an HTML element, stripping script, style, and comments
   */
  private static getCleanText(el: Element): string {
    const clone = el.cloneNode(true) as HTMLElement;
    const toRemove = clone.querySelectorAll('script, style, svg, button, nav, noscript');
    toRemove.forEach((node) => node.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Extracts problem metadata, full statement, constraints, and sample cases from CodeChef DOM
   */
  public static getProblemContext(): ProblemContext {
    const url = window.location.href;
    const path = window.location.pathname;

    if (!this.isCodeChef()) {
      return {
        platform: 'Unknown',
        problemCode: null,
        problemTitle: null,
        url,
        language: 'Unknown',
        isContest: false,
        isPractice: false,
        editorAttached: false,
        timestamp: Date.now(),
        extractionSuccess: false,
      };
    }

    // 1. Extract problem code from URL
    let problemCode: string | null = null;
    const problemMatch = path.match(/\/problems\/([A-Za-z0-9_]+)/);
    if (problemMatch && problemMatch[1]) {
      problemCode = problemMatch[1];
    } else {
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        problemCode = segments[segments.length - 1];
      }
    }

    // 2. Extract title from DOM (excluding examples, constraints, or section headers)
    const isBadTitle = (t: string) => {
      const lower = t.toLowerCase().trim();
      return (
        lower.startsWith('example') ||
        lower.startsWith('input') ||
        lower.startsWith('output') ||
        lower.startsWith('constraints') ||
        lower.startsWith('explanation') ||
        lower.length < 3 ||
        lower.length > 120
      );
    };

    let problemTitle: string | null = null;
    const candidates = Array.from(
      document.querySelectorAll(
        '._submit__container_r7a3j_391 h1, ._labView_1kzfa_2 h1, ._submit__container_r7a3j_391 h2, ._labView_1kzfa_2 h2, h1, ._title_bh3c4_14, [class*="problem-title"], #problem-statement h3, .problem-statement h2'
      )
    );

    for (const el of candidates) {
      const txt = (el.textContent || '').trim();
      if (txt && !isBadTitle(txt)) {
        problemTitle = txt;
        break;
      }
    }

    if (!problemTitle && problemCode) {
      problemTitle = problemCode;
    }

    // 3. Extract active language
    let language = 'C++';
    const activeEditor = document.querySelector('.monaco-editor') as HTMLElement | null;
    const activeUri = activeEditor?.dataset?.uri || '';
    const hasJavaTabs = !!document.querySelector('.tabs-container .tab[aria-label*=".java"]') ||
      Array.from(document.querySelectorAll('.tabs-container .tab')).some(t => (t as HTMLElement).innerText.includes('.java'));

    if (activeUri.endsWith('.java') || hasJavaTabs) {
      language = 'Java';
    } else if (activeUri.endsWith('.py')) {
      language = 'Python3';
    } else {
      const langSelect =
        document.querySelector('#language-select') ||
        document.querySelector('.MuiSelect-select') ||
        document.querySelector('[data-testid="language-select"]');
      if (langSelect && langSelect.textContent) {
        language = langSelect.textContent.trim();
      }
    }

    // 4. Check if IDE container is mounted
    const ideContainer =
      document.querySelector('.monaco-workbench') ||
      document.querySelector('#codechef-code-editor') ||
      document.querySelector('.monaco-editor') ||
      document.querySelector('#submit-ide-v2') ||
      document.querySelector('.ace_editor');
    const isMonaco = !!(document.querySelector('.monaco-workbench') || document.querySelector('.monaco-editor') || document.querySelector('#codechef-code-editor'));
    const isAce = !!(document.querySelector('#submit-ide-v2') || document.querySelector('.ace_editor'));
    const editorAttached = isMonaco || isAce || !!ideContainer;
    const editorFramework = isMonaco ? 'VS Code Web (Monaco)' : isAce ? 'Ace v1.42.0' : 'Editor Attached';

    // 5. Check contest status
    const isContest = !path.includes('/practice/') && !path.includes('/learn/') && path.split('/').filter(Boolean).length > 2;

    // 6. Deep Statement & Section Extraction
    let problemStatement = '';
    let inputFormat: string | undefined;
    let outputFormat: string | undefined;
    let constraints: string | undefined;
    const sampleCases: ExampleCaseDTO[] = [];
    let extractionSuccess = false;

    const statementContainer =
      document.querySelector('._submit__container_r7a3j_391') ||
      document.querySelector('._labView_1kzfa_2') ||
      document.querySelector('#problem-statement') ||
      document.querySelector('.problem-statement') ||
      document.querySelector('[class*="problem-statement"]') ||
      document.querySelector('[data-testid="problem-statement"]') ||
      document.querySelector('div[class*="statement"]');

    if (statementContainer) {
      extractionSuccess = true;
      const fullText = this.getCleanText(statementContainer);
      problemStatement = fullText;

      // Extract sections based on heading patterns
      const headings = Array.from(statementContainer.querySelectorAll('h2, h3, h4, strong, b'));
      headings.forEach((heading) => {
        const text = (heading.textContent || '').trim().toLowerCase();
        let sectionText = '';
        let next = heading.nextElementSibling;
        while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
          sectionText += ' ' + this.getCleanText(next);
          next = next.nextElementSibling;
        }
        sectionText = sectionText.trim();

        if (text.includes('input format') || text === 'input') {
          inputFormat = sectionText || undefined;
        } else if (text.includes('output format') || text === 'output') {
          outputFormat = sectionText || undefined;
        } else if (text.includes('constraints')) {
          constraints = sectionText || undefined;
        }
      });

      // Extract Sample Test Cases from <pre> tags or sample tables
      const preTags = Array.from(statementContainer.querySelectorAll('pre'));
      if (preTags.length >= 2) {
        // Pairs of input and output
        for (let i = 0; i < preTags.length - 1; i += 2) {
          const inputContent = preTags[i].textContent?.trim() || '';
          const outputContent = preTags[i + 1].textContent?.trim() || '';
          if (inputContent && outputContent) {
            sampleCases.push({
              input: inputContent,
              output: outputContent,
              explanation: `Sample test case ${Math.floor(i / 2) + 1}`,
            });
          }
        }
      } else if (preTags.length === 1) {
        // Single pre tag possibly containing both input and output
        const content = preTags[0].textContent?.trim() || '';
        const parts = content.split(/output/i);
        if (parts.length === 2) {
          sampleCases.push({
            input: parts[0].replace(/input/i, '').trim(),
            output: parts[1].trim(),
            explanation: 'Sample test case 1',
          });
        }
      }
    }

    return {
      platform: 'CodeChef',
      problemCode,
      problemTitle: problemTitle || (problemCode ? `Problem: ${problemCode}` : 'CodeChef Problem'),
      url,
      language,
      isContest,
      isPractice: !isContest,
      editorAttached,
      editorFramework,
      timestamp: Date.now(),
      problemStatement: problemStatement || (problemTitle ? `Solve problem: ${problemTitle}` : undefined),
      inputFormat,
      outputFormat,
      constraints,
      sampleCases: sampleCases.length > 0 ? sampleCases : undefined,
      extractionSuccess,
    };
  }
}

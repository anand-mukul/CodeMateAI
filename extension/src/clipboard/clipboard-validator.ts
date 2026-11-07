import { ClipboardValidationResult } from '../types/clipboard';
import { CodeMateError } from './clipboard-errors';

export class ClipboardValidator {
  /**
   * Validates clipboard string content.
   */
  public static validate(rawText: unknown): ClipboardValidationResult {
    if (typeof rawText !== 'string') {
      return {
        isValid: false,
        text: '',
        charCount: 0,
        lineCount: 0,
        detectedLanguage: 'Text',
        error: CodeMateError.getMessage('CLIPBOARD_EMPTY'),
        errorCode: 'CLIPBOARD_EMPTY',
      };
    }

    const trimmed = rawText.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        text: '',
        charCount: 0,
        lineCount: 0,
        detectedLanguage: 'Text',
        error: CodeMateError.getMessage('CLIPBOARD_EMPTY'),
        errorCode: 'CLIPBOARD_EMPTY',
      };
    }

    const lines = rawText.split(/\r?\n/).length;
    const detectedLanguage = this.detectLanguage(rawText);

    return {
      isValid: true,
      text: rawText,
      charCount: rawText.length,
      lineCount: lines,
      detectedLanguage,
    };
  }

  /**
   * Simple heuristic syntax detector for common practice languages
   */
  public static detectLanguage(code: string): string {
    const text = code.trim();

    if (
      text.includes('#include <') ||
      text.includes('using namespace std;') ||
      text.includes('std::cout') ||
      text.includes('ios_base::sync_with_stdio')
    ) {
      return 'C++';
    }

    if (
      text.includes('def ') ||
      text.includes('import sys') ||
      text.includes('if __name__ == "__main__":') ||
      text.includes('print(') && !text.includes('System.out.print') && !text.includes('printf(')
    ) {
      return 'Python';
    }

    if (
      text.includes('public class ') ||
      text.includes('System.out.println') ||
      text.includes('Scanner sc = new Scanner') ||
      text.includes('public static void main')
    ) {
      return 'Java';
    }

    if (
      text.includes('#include <stdio.h>') ||
      text.includes('printf(') ||
      text.includes('scanf(')
    ) {
      return 'C';
    }

    if (
      text.includes('package main') ||
      text.includes('func main()') ||
      text.includes('fmt.Println')
    ) {
      return 'Go';
    }

    if (
      text.includes('const ') ||
      text.includes('let ') ||
      text.includes('console.log(') ||
      text.includes('require(') ||
      text.includes('function ')
    ) {
      return 'JavaScript';
    }

    return 'Code';
  }
}


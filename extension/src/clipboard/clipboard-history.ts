import { Snippet } from '../types/clipboard';
import { ClipboardValidator } from './clipboard-validator';

const STORAGE_KEY = 'codemate_saved_snippets';

export const PREDEFINED_SNIPPETS: Snippet[] = [
  {
    id: 'tpl_cpp_basic',
    title: 'C++ Basic Practice Template',
    language: 'C++',
    code: `#include <iostream>
using namespace std;

void solve() {
    int n;
    if (cin >> n) {
        cout << n << "\\n";
    }
}

int main() {
    solve();
    return 0;
}
`,
    lineCount: 15,
    charCount: 155,
    createdAt: 1700000000000,
    isPredefined: true,
  },
  {
    id: 'tpl_cpp_fastio',
    title: 'C++ Fast I/O Template',
    language: 'C++',
    code: `#include <bits/stdc++.h>
using namespace std;

#define FAST_IO ios_base::sync_with_stdio(false); cin.tie(NULL);

void solve() {
    int t;
    if (cin >> t) {
        while (t--) {
            int a, b;
            cin >> a >> b;
            cout << (a + b) << "\\n";
        }
    }
}

int main() {
    FAST_IO;
    solve();
    return 0;
}
`,
    lineCount: 22,
    charCount: 280,
    createdAt: 1700000000001,
    isPredefined: true,
  },
  {
    id: 'tpl_python_basic',
    title: 'Python 3 Basic Template',
    language: 'Python',
    code: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    for val in input_data:
        print(val)

if __name__ == '__main__':
    solve()
`,
    lineCount: 12,
    charCount: 165,
    createdAt: 1700000000002,
    isPredefined: true,
  },
  {
    id: 'tpl_java_basic',
    title: 'Java Practice Template',
    language: 'Java',
    code: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            System.out.println(n);
        }
        sc.close();
    }
}
`,
    lineCount: 13,
    charCount: 225,
    createdAt: 1700000000003,
    isPredefined: true,
  },
];

export class SnippetManager {
  private static memoryFallback: Snippet[] = [];

  /**
   * Retrieves all snippets (predefined templates + user saved snippets)
   */
  public static async getSnippets(): Promise<Snippet[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          const userSnippets: Snippet[] = result[STORAGE_KEY] || [];
          resolve([...PREDEFINED_SNIPPETS, ...userSnippets]);
        });
      });
    }

    return [...PREDEFINED_SNIPPETS, ...this.memoryFallback];
  }

  /**
   * Saves a new snippet to storage
   */
  public static async saveSnippet(title: string, code: string): Promise<Snippet> {
    const validation = ClipboardValidator.validate(code);
    const newSnippet: Snippet = {
      id: `snip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim() || `Snippet (${validation.detectedLanguage})`,
      code,
      language: validation.detectedLanguage,
      lineCount: validation.lineCount,
      charCount: validation.charCount,
      createdAt: Date.now(),
      isPredefined: false,
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          const existing: Snippet[] = result[STORAGE_KEY] || [];
          const updated = [newSnippet, ...existing].slice(0, 50); // ring buffer of 50
          chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => {
            resolve(newSnippet);
          });
        });
      });
    }

    this.memoryFallback = [newSnippet, ...this.memoryFallback].slice(0, 50);
    return newSnippet;
  }

  /**
   * Deletes a snippet by ID
   */
  public static async deleteSnippet(id: string): Promise<boolean> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          const existing: Snippet[] = result[STORAGE_KEY] || [];
          const updated = existing.filter((s) => s.id !== id);
          chrome.storage.local.set({ [STORAGE_KEY]: updated }, () => {
            resolve(true);
          });
        });
      });
    }

    this.memoryFallback = this.memoryFallback.filter((s) => s.id !== id);
    return true;
  }
}


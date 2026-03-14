import {
  analyze,
  verify,
  generateJsonReport,
  generateHtmlReport,
  generateMarkdownReport,
  generateCsvReport,
  generateParityJson,
  generateParityHtml,
  generateParityMarkdown,
  generateParityCsv,
  generateChecklistJson,
  generateChecklistMarkdown,
  generateChecklistHtml,
  generateParityChecklistJson,
  generateParityChecklistMarkdown,
  generateParityChecklistHtml,
} from '@strapishift/core'
import type { MigrationReport, ParityReport } from '@strapishift/core'

export function useAnalysis() {
  const report = useState<MigrationReport | null>('analysis-report', () => null)
  const parityReport = useState<ParityReport | null>('parity-report', () => null)
  const error = useState<string | null>('analysis-error', () => null)

  function analyzeSchema(jsonString: string): MigrationReport | null {
    error.value = null
    try {
      const parsed = JSON.parse(jsonString)
      const result = analyze(parsed)
      report.value = result
      return result
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to analyze schema'
      return null
    }
  }

  function verifyParity(v3Json: string, v5Json: string): ParityReport | null {
    error.value = null
    try {
      const v3 = JSON.parse(v3Json)
      const v5 = JSON.parse(v5Json)
      const result = verify(v3, v5)
      parityReport.value = result
      return result
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to verify parity'
      return null
    }
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportReport(format: 'json' | 'html' | 'md' | 'csv') {
    if (!report.value) return
    const r = report.value
    switch (format) {
      case 'json':
        downloadFile(generateJsonReport(r), 'strapishift-report.json', 'application/json')
        break
      case 'html':
        downloadFile(generateHtmlReport(r), 'strapishift-report.html', 'text/html')
        break
      case 'md':
        downloadFile(generateMarkdownReport(r), 'strapishift-report.md', 'text/markdown')
        break
      case 'csv':
        downloadFile(generateCsvReport(r), 'strapishift-report.csv', 'text/csv')
        break
    }
  }

  function exportChecklist(format: 'json' | 'html' | 'md') {
    if (!report.value) return
    const r = report.value
    switch (format) {
      case 'json':
        downloadFile(generateChecklistJson(r), 'strapishift-checklist.json', 'application/json')
        break
      case 'html':
        downloadFile(generateChecklistHtml(r), 'strapishift-checklist.html', 'text/html')
        break
      case 'md':
        downloadFile(generateChecklistMarkdown(r), 'strapishift-checklist.md', 'text/markdown')
        break
    }
  }

  function exportParityReport(format: 'json' | 'html' | 'md' | 'csv') {
    if (!parityReport.value) return
    const r = parityReport.value
    switch (format) {
      case 'json':
        downloadFile(generateParityJson(r), 'strapishift-parity.json', 'application/json')
        break
      case 'html':
        downloadFile(generateParityHtml(r), 'strapishift-parity.html', 'text/html')
        break
      case 'md':
        downloadFile(generateParityMarkdown(r), 'strapishift-parity.md', 'text/markdown')
        break
      case 'csv':
        downloadFile(generateParityCsv(r), 'strapishift-parity.csv', 'text/csv')
        break
    }
  }

  function exportParityChecklist(format: 'json' | 'html' | 'md') {
    if (!parityReport.value) return
    const r = parityReport.value
    switch (format) {
      case 'json':
        downloadFile(generateParityChecklistJson(r), 'strapishift-parity-checklist.json', 'application/json')
        break
      case 'html':
        downloadFile(generateParityChecklistHtml(r), 'strapishift-parity-checklist.html', 'text/html')
        break
      case 'md':
        downloadFile(generateParityChecklistMarkdown(r), 'strapishift-parity-checklist.md', 'text/markdown')
        break
    }
  }

  return {
    report,
    parityReport,
    error,
    analyzeSchema,
    verifyParity,
    exportReport,
    exportChecklist,
    exportParityReport,
    exportParityChecklist,
  }
}

export interface PrintSheetType {
  id: string
  name: string
  rowsPerPage: number
}

export const printSheetTypes: PrintSheetType[] = [
  {
    id: 'monthly',
    name: 'شيت شهريات',
    // Landscape A4 with 1.1cm-tall rows fits fewer rows than portrait did.
    rowsPerPage: 8,
  },
]

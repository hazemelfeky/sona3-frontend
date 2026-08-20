export interface PrintSheetType {
  id: string
  kind: 'print'
  name: string
  // Header text for the amount column — the only thing that differs
  // between the printed-page sheet types; everything else is shared.
  amountLabel: string
  rowsPerPage: number
}

export interface CsvSheetType {
  id: string
  kind: 'csv'
  name: string
}

export type SheetType = PrintSheetType | CsvSheetType

export const printSheetTypes: PrintSheetType[] = [
  {
    id: 'monthly',
    kind: 'print',
    name: 'شيت شهريات',
    amountLabel: 'المبلغ',
    // Landscape A4 with 1.7cm-tall rows fits fewer rows than portrait did.
    rowsPerPage: 8,
  },
  {
    id: 'meals',
    kind: 'print',
    name: 'شيت وجبات',
    amountLabel: 'عدد الوجبات',
    rowsPerPage: 8,
  },
  {
    id: 'cartons',
    kind: 'print',
    name: 'شيت كراتين',
    amountLabel: 'عدد الكراتين',
    rowsPerPage: 8,
  },
  {
    id: 'blankets',
    kind: 'print',
    name: 'شيت الحفة',
    amountLabel: 'عدد الالحفة',
    rowsPerPage: 8,
  },
]

export const csvSheetTypes: CsvSheetType[] = [{ id: 'execution', kind: 'csv', name: 'شيت تنفيذ' }]

// Full picker list — print pages first, then CSV exports.
export const allSheetTypes: SheetType[] = [...printSheetTypes, ...csvSheetTypes]

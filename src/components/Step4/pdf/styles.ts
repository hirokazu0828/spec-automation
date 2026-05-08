import { StyleSheet } from '@react-pdf/renderer';
import { FONT_FAMILY } from './fonts';

export const COLORS = {
  text: '#1f2937',
  textMuted: '#4b5563',
  textFaint: '#6b7280',
  border: '#374151',
  borderLight: '#9ca3af',
  borderFaint: '#d1d5db',
  bgCell: '#f9fafb',
  bgHeader: '#e8e8e8',
  bgGreenBanner: '#16a34a',
  bgGreenSoft: '#c8e6c9',
  bgRedBanner: '#cc0000',
  bgOrangeBanner: '#d97706',
  bgOrangeSoft: '#fffbeb',
  bgIndigoBanner: '#6366f1',
  white: '#ffffff',
} as const;

export const PAGE_PROPS = {
  size: 'A4' as const,
  orientation: 'landscape' as const,
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    lineHeight: 1.35,
  },

  // Header (every page)
  headerWrap: {
    marginBottom: 12,
  },
  headerTable: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: COLORS.border,
  },
  headerCell: {
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  headerLabelRed: {
    backgroundColor: COLORS.bgRedBanner,
    color: COLORS.white,
    width: 110,
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  headerLabelOrange: {
    backgroundColor: COLORS.bgOrangeBanner,
    color: COLORS.white,
    width: 130,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
  },
  headerCellTitle: {
    backgroundColor: COLORS.bgCell,
    color: COLORS.textMuted,
    fontSize: 7.5,
    paddingVertical: 2,
  },
  headerCellValue: {
    fontWeight: 'bold',
    fontSize: 10,
    paddingVertical: 4,
  },
  headerPageNum: {
    fontSize: 8,
    color: COLORS.textFaint,
    textAlign: 'right',
    marginTop: 2,
    fontWeight: 'bold',
  },

  // Section banner
  sectionBanner: {
    backgroundColor: COLORS.bgGreenBanner,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },

  // Generic table
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: COLORS.border,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  th: {
    backgroundColor: COLORS.bgHeader,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    fontSize: 9,
  },
  td: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    fontSize: 9,
  },
  tdGreen: {
    backgroundColor: COLORS.bgGreenSoft,
    fontWeight: 'bold',
  },

  // SAMPLE arrangement block (sample only, on PAGE 1)
  arrangementWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.bgOrangeBanner,
    backgroundColor: COLORS.bgOrangeSoft,
    padding: 8,
    marginBottom: 10,
  },
  arrangementBadge: {
    backgroundColor: COLORS.bgOrangeBanner,
    color: COLORS.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  arrangementRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 9,
  },
  arrangementLabel: {
    width: 70,
    color: COLORS.textMuted,
  },
  arrangementValue: {
    flex: 1,
  },

  // Parallel layout (PAGE 1 in parallel mode)
  parallelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  parallelCol: {
    flex: 1,
    minWidth: 0,
  },
  parallelLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.bgIndigoBanner,
    marginBottom: 4,
  },

  // Misc
  pageBreak: {
    marginBottom: 8,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
});

export type DocumentType = 'sample' | 'final';
export type ImageSource = 'generated' | 'manual' | 'photo';

export type SampleArrangement = {
  shippingDate?: string;
  quantities: {
    customer: number;
    tokyo: number;
    factory: number;
  };
  unit: string;
  arrangementNotes?: string;
  referenceSampleId?: string;
};

export type SpecData = {
  // STEP1
  productCode: string;
  seasonCode: string;
  brandName: string;
  staffName: string;
  clientName: string;
  issueDate: string;
  revisionNote: string;
  hasRevision: boolean;
  headShape: string;
  position: string;
  conceptMemo: string;

  // STEP2
  bodyFabric: string;
  texture: string;
  lining: string;
  piping: string;
  closure: string;
  embroidery: string;
  bodyColor: string;
  colorCode: string;
  hardwareFinish: string;

  // p.2生地仕様ページ用
  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  dimensionPiping: string;
  dimensionEmbroidery: string;
  sewingNotes: string;
  revisionHistory: Array<{ date: string; content: string }>;
  fabricParts: Array<{
    id: string;
    label: string;
    usage: string;
    material: string;
    partNumber: string;
    quantity: string;
    colorName: string;
    threadNumber: string;
    colorSwatch: string;
  }>;
  productPhotos: Array<{
    name: string;
    dataUrl: string;
  }>;

  // p.3刺繍指示ページ用
  embroideryDetails: Array<{
    id: string;
    technique: string;
    threadType: string;
    threadNumber: string;
    size: string;
    placement: string;
  }>;

  baseProposal?: ProposalBase | null;

  /**
   * Where this draft originated. Set once at creation and never reassigned
   * afterwards (used for the Step1 origin badge and analytics).
   *   A = SampleBook を起点に新規作成
   *   B = 既存ドラフトを複製して新規作成
   *   C = コンセプトから白紙で新規作成
   * Optional because drafts created before Layer 6 do not carry it.
   */
  originRoute?: 'A' | 'B' | 'C';
  /** Route A: the sample_number of the source sample. */
  originSampleId?: string;
  /** Route B: the id of the source draft. */
  originDraftId?: string;

  /**
   * Whether this draft is a sample instruction sheet ('sample') or the final
   * spec sheet ('final'). New drafts default to 'sample'; legacy drafts loaded
   * from before Layer 4 are migrated to 'final' to preserve their existing
   * appearance.
   */
  documentType: DocumentType;
  /** 1-based revision counter, only meaningful when documentType === 'sample'. */
  sampleRevision?: number;
  /** Sample-only arrangement section that prints on the cover page. */
  sampleArrangement?: SampleArrangement;
  /** Where the product image came from (Layer 3 will refine this). */
  imageSource?: ImageSource;
};

export type ProposalBase = {
  bodyFabric: string;
  texture: string;
  lining: string;
  piping: string;
  closure: string;
  embroidery: string;
  bodyColor: string;
  hardwareFinish: string;
};

export const PROPOSAL_KEYS: ReadonlyArray<keyof ProposalBase> = [
  'bodyFabric',
  'texture',
  'lining',
  'piping',
  'closure',
  'embroidery',
  'bodyColor',
  'hardwareFinish',
];

export const initialSpecData: SpecData = {
  productCode: '',
  seasonCode: '',
  brandName: '',
  staffName: '',
  clientName: '',
  issueDate: new Date().toISOString().split('T')[0],
  revisionNote: '',
  hasRevision: false,
  headShape: '',
  position: '',
  conceptMemo: '',

  bodyFabric: '',
  texture: '',
  lining: '',
  piping: '',
  closure: '',
  embroidery: '',
  bodyColor: '',
  colorCode: '',
  hardwareFinish: '',

  dimensionLength: '',
  dimensionWidth: '',
  dimensionHeight: '',
  dimensionPiping: '',
  dimensionEmbroidery: '',
  sewingNotes: '',
  revisionHistory: [{ date: new Date().toISOString().split('T')[0], content: '' }],
  fabricParts: [
    { id: '1', label: 'A', usage: '', material: '', partNumber: '', quantity: '', colorName: '', threadNumber: '', colorSwatch: '#000000' },
    { id: '2', label: 'B', usage: '', material: '', partNumber: '', quantity: '', colorName: '', threadNumber: '', colorSwatch: '#000000' },
    { id: '3', label: 'C', usage: '', material: '', partNumber: '', quantity: '', colorName: '', threadNumber: '', colorSwatch: '#000000' },
    { id: '4', label: 'D', usage: '', material: '', partNumber: '', quantity: '', colorName: '', threadNumber: '', colorSwatch: '#000000' },
  ],
  productPhotos: [
    { name: '正面', dataUrl: '' },
    { name: '側面', dataUrl: '' },
    { name: '背面', dataUrl: '' },
  ],
  embroideryDetails: [
    { id: '1', technique: '', threadType: '', threadNumber: '', size: '', placement: '' },
    { id: '2', technique: '', threadType: '', threadNumber: '', size: '', placement: '' },
    { id: '3', technique: '', threadType: '', threadNumber: '', size: '', placement: '' },
  ],
  baseProposal: null,
  documentType: 'sample',
  sampleRevision: 1,
  sampleArrangement: {
    quantities: { customer: 0, tokyo: 0, factory: 0 },
    unit: '個',
  },
};

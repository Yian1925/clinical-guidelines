declare module './CervicalCancerTree' {
  import type { FC } from 'react';
  export interface CervicalTreeData {
    name?: string;
    nodes: Array<{
      id: string;
      type?: string;
      category?: string;
      data?: { label?: string; sublabel?: string; detail?: string; [key: string]: unknown };
    }>;
    edges?: Array<{ id?: string; source: string; target: string; [key: string]: unknown }>;
  }
  export interface CervicalCancerTreeProps {
    treeData?: CervicalTreeData | null;
    embedded?: boolean;
  }
  const CervicalCancerTree: FC<CervicalCancerTreeProps>;
  export default CervicalCancerTree;
}

const fs = require('fs');

let content = fs.readFileSync('src/pages/Architect.tsx', 'utf-8');

// Insert imports
content = content.replace(
  'import { Sparkles, Save, GripVertical, Trash2, Plus, Edit2, CheckCircle2, Circle, AlertTriangle, FileText, ChevronDown } from "lucide-react";',
  `import { Sparkles, Save, GripVertical, Trash2, Plus, Edit2, CheckCircle2, Circle, AlertTriangle, FileText, ChevronDown, Combine, SplitSquareHorizontal } from "lucide-react";\nimport { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";`
);

fs.writeFileSync('src/pages/Architect.tsx', content);

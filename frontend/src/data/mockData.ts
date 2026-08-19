import { ScanResponse, WasteCategory } from "@/types";

/** Rotating mock data for the Demo Mode — cycles through all waste categories */
const MOCK_RESPONSES: Partial<Record<WasteCategory, ScanResponse>> = {
  plastic: {
    success: true,
    demo_mode: true,
    confidence: 0.94,
    detected_labels: ["Bottle", "Plastic", "Water bottle", "Container", "Packaging"],
    waste_info: {
      category: "plastic",
      label: "Plástico",
      is_recyclable: true,
      color_hex: "#EAB308",
      color_name: "Amarelo",
      color_tailwind: "yellow",
      icon_name: "Recycle",
      cleaning_instructions: [
        "Esvazie completamente o recipiente",
        "Enxágue com água para remover resíduos de alimentos",
        "Não precisa estar perfeitamente limpo — apenas sem resíduos sólidos",
        "Remova tampas e rótulos de papel quando possível",
      ],
      disposal_instructions: "Deposite na lixeira AMARELA ou no ecoponto de plásticos",
      description: "Material plástico identificado. Polímeros como PET, PEAD e PP são amplamente recicláveis.",
      eco_tip: "♻️ 1 garrafa PET reciclada economiza energia suficiente para iluminar uma lâmpada por 6 horas!",
    },
  },
  paper: {
    success: true,
    demo_mode: true,
    confidence: 0.91,
    detected_labels: ["Paper", "Cardboard", "Box", "Newspaper", "Packaging and labeling"],
    waste_info: {
      category: "paper",
      label: "Papel / Papelão",
      is_recyclable: true,
      color_hex: "#3B82F6",
      color_name: "Azul",
      color_tailwind: "blue",
      icon_name: "FileText",
      cleaning_instructions: [
        "Mantenha seco — papel molhado não é reciclável",
        "Remova grampos, clipes e fitas adesivas",
        "Desdobre caixas de papelão para economizar espaço",
        "Não misture com papel engordurado (guardanapos, pizza)",
      ],
      disposal_instructions: "Deposite na lixeira AZUL de coleta seletiva",
      description: "Papel ou papelão identificado. Evite descartar papel higiênico e papel parafinado — esses são rejeitos.",
      eco_tip: "🌳 Reciclar 1 tonelada de papel salva até 15 árvores e economiza 50% de energia!",
    },
  },
  glass: {
    success: true,
    demo_mode: true,
    confidence: 0.89,
    detected_labels: ["Glass", "Glass bottle", "Drinkware", "Jar", "Wine glass"],
    waste_info: {
      category: "glass",
      label: "Vidro",
      is_recyclable: true,
      color_hex: "#22C55E",
      color_name: "Verde",
      color_tailwind: "green",
      icon_name: "Wine",
      cleaning_instructions: [
        "Esvazie e enxágue o recipiente com água",
        "Não quebre o vidro — fragmentos causam acidentes",
        "Remova tampas plásticas ou metálicas separadamente",
        "Espelhos e vidros de janela não são recicláveis junto com embalagens",
      ],
      disposal_instructions: "Deposite na lixeira VERDE ou no ecoponto de vidro",
      description: "Material de vidro identificado. O vidro é 100% reciclável e pode ser reprocessado infinitas vezes.",
      eco_tip: "✨ O vidro é 100% reciclável e infinitamente reutilizável sem perder qualidade!",
    },
  },
  metal: {
    success: true,
    demo_mode: true,
    confidence: 0.93,
    detected_labels: ["Can", "Aluminum", "Metal", "Beverage can", "Tin"],
    waste_info: {
      category: "metal",
      label: "Metal",
      is_recyclable: true,
      color_hex: "#EAB308",
      color_name: "Amarelo",
      color_tailwind: "yellow",
      icon_name: "Zap",
      cleaning_instructions: [
        "Esvazie completamente a lata ou embalagem",
        "Enxágue para remover resíduos de alimentos",
        "Amasse levemente para reduzir volume",
        "Cuidado com bordas cortantes",
      ],
      disposal_instructions: "Deposite na lixeira AMARELA de coleta seletiva",
      description: "Metal identificado (alumínio, aço, ferro). Latas e embalagens metálicas têm alto valor de reciclagem.",
      eco_tip: "⚡ Reciclar alumínio usa 95% menos energia do que produzir do zero!",
    },
  },
  organic: {
    success: true,
    demo_mode: true,
    confidence: 0.87,
    detected_labels: ["Food", "Fruit", "Vegetable", "Natural foods", "Produce"],
    waste_info: {
      category: "organic",
      label: "Orgânico",
      is_recyclable: false,
      color_hex: "#A16207",
      color_name: "Marrom",
      color_tailwind: "amber",
      icon_name: "Leaf",
      cleaning_instructions: [
        "Não é necessário limpar",
        "Separe de materiais recicláveis para evitar contaminação",
        "Considere compostar em casa — é fácil e sustentável",
        "Cascas de frutas, vegetais e sobras de comida são ideais para compostagem",
      ],
      disposal_instructions: "Deposite na lixeira MARROM (orgânico) ou use para compostagem doméstica",
      description: "Resíduo orgânico identificado. Alimentos, cascas e restos vegetais podem ser compostados.",
      eco_tip: "🌱 Composto orgânico caseiro reduz o lixo em até 30% e ainda fertiliza plantas!",
    },
  },
  reject: {
    success: true,
    demo_mode: true,
    confidence: 0.82,
    detected_labels: ["Electronics", "Battery", "Ceramic", "Light bulb", "Fluorescent lamp"],
    waste_info: {
      category: "reject",
      label: "Rejeito",
      is_recyclable: false,
      color_hex: "#EF4444",
      color_name: "Vermelho",
      color_tailwind: "red",
      icon_name: "AlertTriangle",
      cleaning_instructions: [
        "Este material não é reciclável na coleta convencional",
        "Não misture com recicláveis — contamina a carga",
        "Verifique se há ecopontos especializados para este material na sua cidade",
        "Pilhas, eletrônicos e medicamentos têm descarte especial",
      ],
      disposal_instructions: "Deposite na lixeira CINZA/VERMELHA (rejeito não reciclável)",
      description: "Material identificado como rejeito. Não contamina recicláveis quando descartado separadamente.",
      eco_tip: "🔋 Pilhas e eletrônicos devem ir para pontos de coleta especial — nunca no lixo comum!",
    },
  },
};

const CYCLE_ORDER: WasteCategory[] = ["plastic", "paper", "glass", "metal", "organic", "reject"];
let demoIndex = 0;

export function getNextDemoResponse(): ScanResponse {
  const category = CYCLE_ORDER[demoIndex % CYCLE_ORDER.length];
  demoIndex++;
  return MOCK_RESPONSES[category]!;
}

export function getDemoResponse(category: WasteCategory): ScanResponse {
  return MOCK_RESPONSES[category]!;
}

export { MOCK_RESPONSES };

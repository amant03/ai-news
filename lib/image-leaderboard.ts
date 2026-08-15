/**
 * Text-to-Image model leaderboard data scraped from
 * https://artificialanalysis.ai/image/leaderboard/text-to-image
 * on 2026-08-15. Rank, Elo, CI, samples, release date, and API pricing.
 */

export interface ImageModel {
  rank: number;
  creator: string;
  name: string;
  elo: number;
  ci95: string;
  samples: number;
  released: string;
  pricePer1k: string;
  openWeights?: boolean;
}

export const IMAGE_MODELS: ImageModel[] = [
  { rank: 1, creator: 'OpenAI', name: 'GPT Image 2 (high)', elo: 1370, ci95: '-10/10', samples: 13336, released: 'Apr 2026', pricePer1k: '$211.0' },
  { rank: 2, creator: 'Reve', name: 'Reve 2.1', elo: 1326, ci95: '-9/9', samples: 15066, released: 'Jul 2026', pricePer1k: '$200.0' },
  { rank: 3, creator: 'Google', name: 'Nano Banana 2 (Gemini 3.1 Flash Image Preview)', elo: 1323, ci95: '-9/9', samples: 14767, released: 'Feb 2026', pricePer1k: '$67.0' },
  { rank: 4, creator: 'OpenAI', name: 'GPT Image 1.5 (high)', elo: 1313, ci95: '-10/10', samples: 13184, released: 'Dec 2025', pricePer1k: '$133.0' },
  { rank: 5, creator: 'Microsoft AI', name: 'MAI-Image-2.5', elo: 1310, ci95: '-9/9', samples: 14529, released: 'Jun 2026', pricePer1k: '$48.1' },
  { rank: 6, creator: 'Google', name: 'Nano Banana Pro (Gemini 3 Pro Image)', elo: 1299, ci95: '-9/9', samples: 13340, released: 'Nov 2025', pricePer1k: '$134.0' },
  { rank: 7, creator: 'Google', name: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)', elo: 1292, ci95: '-9/9', samples: 13652, released: 'Jun 2026', pricePer1k: '$33.6' },
  { rank: 8, creator: 'Bytedance', name: 'Seedream 5.0 Pro', elo: 1282, ci95: '-9/9', samples: 11291, released: 'Jul 2026', pricePer1k: '$90.0' },
  { rank: 9, creator: 'SpaceXAI', name: 'grok-imagine-image-quality', elo: 1237, ci95: '-8/8', samples: 16074, released: 'Apr 2026', pricePer1k: '$50.0' },
  { rank: 10, creator: 'Alibaba', name: 'Qwen Image 2.0 Pro', elo: 1234, ci95: '-10/10', samples: 4669, released: 'Apr 2026', pricePer1k: '$75.0' },
  { rank: 11, creator: 'Black Forest Labs', name: 'FLUX.2 [max]', elo: 1232, ci95: '-9/9', samples: 9235, released: 'Dec 2025', pricePer1k: '$70.0' },
  { rank: 12, creator: 'Microsoft AI', name: 'MAI-Image-2.5-Flash', elo: 1230, ci95: '-10/10', samples: 4475, released: 'Jun 2026', pricePer1k: '$20.0' },
  { rank: 13, creator: 'HiDream', name: 'HiDream-O1-Image-1.5', elo: 1228, ci95: '-9/9', samples: 11862, released: 'Jun 2026', pricePer1k: '$80.0' },
  { rank: 14, creator: 'Luma Labs', name: 'Luma UNI 1 Max', elo: 1226, ci95: '-10/10', samples: 4073, released: 'May 2026', pricePer1k: '$100.0' },
  { rank: 15, creator: 'Krea', name: 'Krea 2 Medium Turbo', elo: 1223, ci95: '-10/10', samples: 4668, released: 'Jun 2026', pricePer1k: '$15.0' },
  { rank: 16, creator: 'Krea', name: 'Krea 2 Large', elo: 1223, ci95: '-8/8', samples: 14170, released: 'May 2026', pricePer1k: '$60.0' },
  { rank: 17, creator: 'ByteDance Seed', name: 'Seedream 4.0', elo: 1221, ci95: '-11/11', samples: 4014, released: 'Sept 2025', pricePer1k: '$30.0' },
  { rank: 18, creator: 'Black Forest Labs', name: 'FLUX.2 [flex]', elo: 1220, ci95: '-11/11', samples: 4481, released: 'Nov 2025', pricePer1k: '$60.0' },
  { rank: 19, creator: 'Recraft', name: 'Recraft V4.1 Utility Pro', elo: 1220, ci95: '-8/8', samples: 15249, released: 'May 2026', pricePer1k: '$210.0' },
  { rank: 20, creator: 'SpaceXAI', name: 'grok-imagine-image', elo: 1220, ci95: '-11/11', samples: 4641, released: 'Jan 2026', pricePer1k: '$20.0' },
  { rank: 21, creator: 'Recraft', name: 'Recraft V4.1 Utility', elo: 1217, ci95: '-10/10', samples: 6287, released: 'May 2026', pricePer1k: '$35.0' },
  { rank: 22, creator: 'Ideogram', name: 'Ideogram 4.0', elo: 1217, ci95: '-9/9', samples: 6588, released: 'Jun 2026', pricePer1k: '$60.0', openWeights: true },
  { rank: 23, creator: 'Ideogram', name: 'Ideogram 4.0 (Quality)', elo: 1216, ci95: '-8/8', samples: 9416, released: 'Jun 2026', pricePer1k: '$100.0', openWeights: true },
  { rank: 24, creator: 'Krea', name: 'Krea 2 Medium', elo: 1213, ci95: '-8/8', samples: 14336, released: 'May 2026', pricePer1k: '$30.0' },
  { rank: 25, creator: 'Alibaba', name: 'Wan2.6 Text to Image', elo: 1212, ci95: '-10/10', samples: 3702, released: 'Jan 2026', pricePer1k: '$30.0' },
  { rank: 26, creator: 'Black Forest Labs', name: 'FLUX.2 [pro]', elo: 1211, ci95: '-9/9', samples: 9404, released: 'Nov 2025', pricePer1k: '$30.0' },
  { rank: 27, creator: 'Microsoft AI', name: 'MAI-Image-2', elo: 1210, ci95: '-8/8', samples: 5018, released: 'Mar 2026', pricePer1k: '$35.0' },
  { rank: 28, creator: 'Alibaba', name: 'Wan 2.6 Image', elo: 1210, ci95: '-10/10', samples: 3683, released: 'Dec 2025', pricePer1k: '$30.0' },
  { rank: 29, creator: 'ByteDance Seed', name: 'Seedream 4.5', elo: 1206, ci95: '-10/10', samples: 5086, released: 'Dec 2025', pricePer1k: '$40.0' },
  { rank: 30, creator: 'OpenAI', name: 'GPT Image 1 (high)', elo: 1204, ci95: '-10/10', samples: 3722, released: 'Apr 2025', pricePer1k: '$167.0' },
  { rank: 31, creator: 'Luma Labs', name: 'Luma UNI 1', elo: 1203, ci95: '-10/10', samples: 4311, released: 'May 2026', pricePer1k: '$40.4' },
  { rank: 32, creator: 'Bytedance', name: 'Seedream 5.0 Lite', elo: 1203, ci95: '-10/10', samples: 3788, released: 'Feb 2026', pricePer1k: '$35.0' },
  { rank: 33, creator: 'Fal', name: 'Ideogram 4.0 Fast (Quality)', elo: 1203, ci95: '-10/10', samples: 4829, released: 'Jul 2026', pricePer1k: '$17.5', openWeights: true },
  { rank: 34, creator: 'HiDream', name: 'HiDream-O1-Image-Dev-2604', elo: 1201, ci95: '-8/8', samples: 4648, released: 'May 2026', pricePer1k: 'No API', openWeights: true },
  { rank: 35, creator: 'Black Forest Labs', name: 'FLUX.2 [dev]', elo: 1200, ci95: '-8/8', samples: 18278, released: 'Nov 2025', pricePer1k: '$12.0', openWeights: true },
  { rank: 36, creator: 'Pruna AI', name: 'P-Image-Ideogram (High)', elo: 1200, ci95: '-11/11', samples: 2538, released: 'Jul 2026', pricePer1k: '$15.0' },
  { rank: 37, creator: 'Fal', name: 'FLUX.2 [dev] Turbo', elo: 1199, ci95: '-10/10', samples: 4899, released: 'Dec 2025', pricePer1k: '$8.0', openWeights: true },
  { rank: 38, creator: 'Recraft', name: 'Recraft V4 Pro', elo: 1194, ci95: '-10/10', samples: 3780, released: 'Feb 2026', pricePer1k: '$250.0' },
  { rank: 39, creator: 'Recraft', name: 'Recraft V4.1', elo: 1191, ci95: '-10/10', samples: 4931, released: 'May 2026', pricePer1k: '$35.0' },
  { rank: 40, creator: 'Google', name: 'Imagen 4 Ultra', elo: 1191, ci95: '-8/8', samples: 4678, released: 'Jun 2025', pricePer1k: '$60.0' },
  { rank: 41, creator: 'Google', name: 'Nano Banana (Gemini 2.5 Flash Image)', elo: 1190, ci95: '-10/10', samples: 3684, released: 'Aug 2025', pricePer1k: '$39.0' },
  { rank: 42, creator: 'Fal', name: 'Ideogram 4.0 Instant', elo: 1188, ci95: '-10/10', samples: 3975, released: 'Jul 2026', pricePer1k: '$7.5', openWeights: true },
  { rank: 43, creator: 'Recraft', name: 'Recraft V4.1 Pro', elo: 1188, ci95: '-10/10', samples: 4862, released: 'May 2026', pricePer1k: '$210.0' },
  { rank: 44, creator: 'Recraft', name: 'Recraft V4', elo: 1182, ci95: '-10/10', samples: 3846, released: 'Feb 2026', pricePer1k: '$40.0' },
  { rank: 45, creator: 'Microsoft AI', name: 'MAI-Image-2-Efficient', elo: 1182, ci95: '-8/8', samples: 5205, released: 'Apr 2026', pricePer1k: '$22.0' },
  { rank: 46, creator: 'Pruna AI', name: 'P-Image-Ideogram (Medium)', elo: 1180, ci95: '-11/11', samples: 2852, released: 'Jul 2026', pricePer1k: '$10.0' },
  { rank: 47, creator: 'Alibaba', name: 'Wan 2.7 Pro', elo: 1180, ci95: '-10/10', samples: 3891, released: 'Apr 2026', pricePer1k: '$64.0' },
  { rank: 48, creator: 'Fal', name: 'FLUX.2 [dev] Flash', elo: 1178, ci95: '-10/10', samples: 3846, released: 'Dec 2025', pricePer1k: '$5.0', openWeights: true },
  { rank: 49, creator: 'HiDream', name: 'HiDream-O1-Image', elo: 1178, ci95: '-10/10', samples: 4032, released: 'May 2026', pricePer1k: 'Coming soon', openWeights: true },
  { rank: 50, creator: 'Alibaba', name: 'Qwen Image Max 2512', elo: 1175, ci95: '-9/9', samples: 3982, released: 'Dec 2025', pricePer1k: '$20.0', openWeights: true },
  { rank: 51, creator: 'Fal', name: 'Ideogram 4.0 Fast', elo: 1174, ci95: '-10/10', samples: 4008, released: 'Jul 2026', pricePer1k: '$10.5', openWeights: true },
  { rank: 52, creator: 'ImagineArt', name: 'ImagineArt 2.0', elo: 1174, ci95: '-10/10', samples: 3956, released: 'Apr 2026', pricePer1k: '$30.0' },
  { rank: 53, creator: 'Alibaba', name: 'Wan 2.7', elo: 1172, ci95: '-10/10', samples: 3895, released: 'Apr 2026', pricePer1k: '$26.0' },
  { rank: 54, creator: 'ImagineArt', name: 'ImagineArt 1.5 Preview', elo: 1167, ci95: '-7/7', samples: 10073, released: 'Nov 2025', pricePer1k: '$30.0' },
  { rank: 55, creator: 'Pruna AI', name: 'P-Image-Ideogram (Low)', elo: 1164, ci95: '-11/11', samples: 2887, released: 'Jul 2026', pricePer1k: '$7.5' },
  { rank: 56, creator: 'ByteDance Seed', name: 'Seedream 3.0', elo: 1161, ci95: '-8/8', samples: 4619, released: 'Apr 2025', pricePer1k: '$30.0' },
  { rank: 57, creator: 'Tencent', name: 'HunyuanImage 3.0 Instruct', elo: 1154, ci95: '-10/10', samples: 3845, released: 'Jan 2026', pricePer1k: '$90.0', openWeights: true },
  { rank: 58, creator: 'HiDream', name: 'Vivago 2.1', elo: 1154, ci95: '-8/8', samples: 4211, released: 'Oct 2025', pricePer1k: '$35.0' },
  { rank: 59, creator: 'Alibaba', name: 'Wan 2.5 Preview', elo: 1152, ci95: '-8/8', samples: 4030, released: 'Sept 2025', pricePer1k: '$21.0' },
  { rank: 60, creator: 'Black Forest Labs', name: 'FLUX.2 [klein] 9B', elo: 1149, ci95: '-9/9', samples: 7939, released: 'Jan 2026', pricePer1k: '$15.0', openWeights: true },
  { rank: 61, creator: 'Black Forest Labs', name: 'FLUX.1 Kontext [max]', elo: 1145, ci95: '-10/10', samples: 3811, released: 'May 2025', pricePer1k: '$80.0' },
  { rank: 62, creator: 'KlingAI', name: 'Kolors 2.1', elo: 1144, ci95: '-8/8', samples: 3736, released: 'Jul 2025', pricePer1k: '$14.0' },
  { rank: 63, creator: 'Api Airforce', name: 'image-1', elo: 1143, ci95: '-8/8', samples: 5200, released: 'Apr 2026', pricePer1k: '$40.0' },
  { rank: 64, creator: 'Tencent', name: 'HunyuanImage 3.0', elo: 1136, ci95: '-10/10', samples: 3957, released: 'Sept 2025', pricePer1k: '$100.0', openWeights: true },
  { rank: 65, creator: 'Alibaba', name: 'Qwen Image 2.0', elo: 1136, ci95: '-8/8', samples: 4612, released: 'Mar 2026', pricePer1k: '$35.0' },
  { rank: 66, creator: 'Alibaba', name: 'Z-Image Turbo', elo: 1131, ci95: '-9/9', samples: 7157, released: 'Dec 2025', pricePer1k: '$5.0', openWeights: true },
  { rank: 67, creator: 'Google', name: 'Imagen 3 (v002)', elo: 1127, ci95: '-8/8', samples: 4924, released: 'Dec 2024', pricePer1k: '$40.0' },
  { rank: 68, creator: 'HiDream', name: 'Vivago 2.0', elo: 1125, ci95: '-9/9', samples: 3603, released: 'Jun 2025', pricePer1k: 'No API' },
  { rank: 69, creator: 'Eigen AI', name: 'Eigen Image', elo: 1125, ci95: '-8/8', samples: 5601, released: 'Jan 2026', pricePer1k: '$25.0' },
  { rank: 70, creator: 'Leonardo.Ai', name: 'Lucid Origin Ultra', elo: 1124, ci95: '-7/7', samples: 6256, released: 'Aug 2025', pricePer1k: '$86.7' },
  { rank: 71, creator: 'Google', name: 'Imagen 4 Standard', elo: 1122, ci95: '-8/8', samples: 3988, released: 'Jun 2025', pricePer1k: '$40.0' },
  { rank: 72, creator: 'Reve', name: 'Reve Image (Halfmoon)', elo: 1119, ci95: '-9/9', samples: 3192, released: 'Mar 2025', pricePer1k: 'No API' },
  { rank: 73, creator: 'KlingAI', name: 'Kling Image 3.0 Omni', elo: 1117, ci95: '-7/7', samples: 6208, released: 'Feb 2026', pricePer1k: '$28.0' },
  { rank: 74, creator: 'Vidu', name: 'Vidu Q2', elo: 1115, ci95: '-7/7', samples: 6681, released: 'Nov 2025', pricePer1k: '$30.0' },
  { rank: 75, creator: 'OpenAI', name: 'GPT Image 1 Mini (medium)', elo: 1113, ci95: '-8/8', samples: 5060, released: 'Oct 2025', pricePer1k: '$11.0' },
  { rank: 76, creator: 'Black Forest Labs', name: 'FLUX.1 Kontext [pro]', elo: 1112, ci95: '-8/8', samples: 4589, released: 'May 2025', pricePer1k: '$40.0' },
  { rank: 77, creator: 'Leonardo.Ai', name: 'Lucid Origin Fast', elo: 1110, ci95: '-7/7', samples: 5914, released: 'Aug 2025', pricePer1k: '$17.9' },
  { rank: 78, creator: 'Alibaba', name: 'Qwen Image Plus 2601', elo: 1110, ci95: '-8/8', samples: 6421, released: 'Jan 2026', pricePer1k: '$30.0' },
  { rank: 79, creator: 'Bytedance', name: 'Dreamina 3.1', elo: 1110, ci95: '-8/8', samples: 5235, released: 'Aug 2025', pricePer1k: '$30.0' },
  { rank: 80, creator: 'Pruna AI', name: 'P-Image-Ideogram (Very Low)', elo: 1108, ci95: '-11/11', samples: 2532, released: 'Jul 2026', pricePer1k: '$3.0' },
  { rank: 81, creator: 'Black Forest Labs', name: 'FLUX1.1 [pro] Ultra', elo: 1106, ci95: '-8/8', samples: 4397, released: 'Nov 2024', pricePer1k: '$60.0' },
  { rank: 82, creator: 'Ideogram', name: 'Ideogram 3.0', elo: 1102, ci95: '-8/8', samples: 4076, released: 'Mar 2025', pricePer1k: '$60.0' },
  { rank: 83, creator: 'Black Forest Labs', name: 'FLUX.2 [klein] Base 9B', elo: 1101, ci95: '-8/8', samples: 4317, released: 'Jan 2026', pricePer1k: '$11.0', openWeights: true },
  { rank: 84, creator: 'Google', name: 'Imagen 4 Fast', elo: 1098, ci95: '-8/8', samples: 3941, released: 'Jun 2025', pricePer1k: '$20.0' },
  { rank: 85, creator: 'Black Forest Labs', name: 'FLUX1.1 [pro]', elo: 1094, ci95: '-7/7', samples: 7372, released: 'Oct 2024', pricePer1k: '$40.0' },
  { rank: 86, creator: 'Pruna AI', name: 'P-Image', elo: 1094, ci95: '-8/8', samples: 4277, released: 'Dec 2025', pricePer1k: '$5.0' },
  { rank: 87, creator: 'Midjourney', name: 'Midjourney v7 Alpha', elo: 1093, ci95: '-9/9', samples: 2976, released: 'Apr 2025', pricePer1k: 'No API' },
  { rank: 88, creator: 'Ideogram', name: 'Ideogram v2', elo: 1087, ci95: '-8/8', samples: 8741, released: 'Aug 2024', pricePer1k: '$80.0' },
  { rank: 89, creator: 'Alibaba', name: 'Qwen Image', elo: 1085, ci95: '-8/8', samples: 4805, released: 'Aug 2025', pricePer1k: '$20.0', openWeights: true },
  { rank: 90, creator: 'Black Forest Labs', name: 'FLUX.1 [pro]', elo: 1084, ci95: '-8/8', samples: 8891, released: 'Aug 2024', pricePer1k: '$50.0' },
  { rank: 91, creator: 'Tencent', name: 'SRPO', elo: 1084, ci95: '-8/8', samples: 4963, released: 'Sept 2025', pricePer1k: '$26.0', openWeights: true },
  { rank: 92, creator: 'Midjourney', name: 'Midjourney v6', elo: 1080, ci95: '-8/8', samples: 12490, released: 'Dec 2023', pricePer1k: 'No API' },
  { rank: 93, creator: 'Tencent', name: 'HunyuanImage 2.1', elo: 1080, ci95: '-8/8', samples: 4486, released: 'Sept 2025', pricePer1k: '$100.0', openWeights: true },
  { rank: 94, creator: 'Bria', name: 'FIBO', elo: 1077, ci95: '-8/8', samples: 4664, released: 'Oct 2025', pricePer1k: '$40.0', openWeights: true },
  { rank: 95, creator: 'Ideogram', name: 'Ideogram v2 Turbo', elo: 1076, ci95: '-8/8', samples: 7757, released: 'Aug 2024', pricePer1k: '$50.0' },
  { rank: 96, creator: 'Luma Labs', name: 'Luma Photon', elo: 1076, ci95: '-8/8', samples: 5601, released: 'Dec 2024', pricePer1k: '$19.0' },
  { rank: 97, creator: 'Recraft', name: 'Recraft V3', elo: 1076, ci95: '-7/7', samples: 7124, released: 'Oct 2024', pricePer1k: '$40.0' },
  { rank: 98, creator: 'HiDream', name: 'HiDream-O1-Image-Dev', elo: 1075, ci95: '-8/8', samples: 4833, released: 'May 2026', pricePer1k: '$5.0', openWeights: true },
  { rank: 99, creator: 'HiDream', name: 'HiDream-I1-Dev', elo: 1074, ci95: '-9/9', samples: 3069, released: 'Apr 2025', pricePer1k: '$24.0', openWeights: true },
  { rank: 100, creator: 'MiniMax', name: 'Image-01', elo: 1071, ci95: '-9/9', samples: 3172, released: 'Feb 2025', pricePer1k: '$10.0' },
  { rank: 101, creator: 'Z AI', name: 'GLM-Image', elo: 1069, ci95: '-8/8', samples: 5488, released: 'Jan 2026', pricePer1k: '$50.0', openWeights: true },
  { rank: 102, creator: 'Alibaba', name: 'Z-Image Base', elo: 1066, ci95: '-8/8', samples: 5936, released: 'Jan 2026', pricePer1k: '$10.0' },
  { rank: 103, creator: 'Microsoft AI', name: 'MAI Image 1', elo: 1065, ci95: '-8/8', samples: 5142, released: 'Nov 2025', pricePer1k: 'No API' },
  { rank: 104, creator: 'HiDream', name: 'HiDream-I1-Fast', elo: 1063, ci95: '-9/9', samples: 3600, released: 'Apr 2025', pricePer1k: '$12.0', openWeights: true },
  { rank: 105, creator: 'Black Forest Labs', name: 'FLUX.2 [klein] 4B', elo: 1061, ci95: '-10/10', samples: 5861, released: 'Jan 2026', pricePer1k: '$14.0', openWeights: true },
  { rank: 106, creator: 'Midjourney', name: 'Midjourney v6.1', elo: 1058, ci95: '-8/8', samples: 8680, released: 'Jul 2024', pricePer1k: 'No API' },
  { rank: 107, creator: 'Bytedance', name: 'Infinity 8B', elo: 1058, ci95: '-9/9', samples: 3345, released: 'Feb 2025', pricePer1k: '$1.7', openWeights: true },
  { rank: 108, creator: 'Meituan', name: 'LongCat Image', elo: 1054, ci95: '-8/8', samples: 3746, released: 'Jan 2026', pricePer1k: '$4.0', openWeights: true },
];

/** Unique creators for filter pills. */
export const IMAGE_CREATORS = [...new Set(IMAGE_MODELS.map(m => m.creator))].sort();

/** Creator color map — consistent per creator. */
const CREATOR_COLORS: Record<string, string> = {};
const PALETTE = [
  '#62c9c8', '#9a7bd4', '#fb7185', '#fbbf24', '#34d399',
  '#f472b6', '#60a5fa', '#a78bfa', '#4ade80', '#f97316',
  '#e879f9', '#22d3ee', '#84cc16', '#ef4444', '#8b5cf6',
];
let ci = 0;
for (const c of IMAGE_CREATORS) {
  CREATOR_COLORS[c] = PALETTE[ci % PALETTE.length];
  ci++;
}
export function creatorColor(creator: string): string {
  return CREATOR_COLORS[creator] || '#94a3b8';
}

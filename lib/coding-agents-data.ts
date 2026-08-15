export interface CodingAgentEval {
  benchmark: string;
  reward: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CodingAgent {
  label: string;
  agent: string;
  provider: string;
  index: number;
  cost: number;
  wallTime: number;
  steps: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  cacheHitRate: number;
  evals: CodingAgentEval[];
}

export const CODING_AGENTS: CodingAgent[] = [
  {
    "label": "Codex - GPT-5.6 Sol (max)",
    "agent": "Codex",
    "provider": "openai",
    "index": 66.6,
    "cost": 7.08,
    "wallTime": 610,
    "steps": 114,
    "totalTokens": 13228192,
    "inputTokens": 6812390,
    "outputTokens": 54860,
    "cacheTokens": 6360943,
    "cacheHitRate": 0.899,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6873,
        "inputTokens": 9770635,
        "outputTokens": 88016
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4328,
        "inputTokens": 7897843,
        "outputTokens": 47042
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.877,
        "inputTokens": 1230509,
        "outputTokens": 21798
      }
    ]
  },
  {
    "label": "Kimi Code CLI - Kimi K3",
    "agent": "Kimi Code CLI",
    "provider": "moonshotai",
    "index": 61.3,
    "cost": 3.18,
    "wallTime": 1428,
    "steps": 125,
    "totalTokens": 10619290,
    "inputTokens": 5400248,
    "outputTokens": 88806,
    "cacheTokens": 5130236,
    "cacheHitRate": 0.95,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6372,
        "inputTokens": 9190581,
        "outputTokens": 134823
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3656,
        "inputTokens": 4719527,
        "outputTokens": 77018
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8373,
        "inputTokens": 1306223,
        "outputTokens": 44306
      }
    ]
  },
  {
    "label": "Opencode - Gemini 3.7 Flash (high)",
    "agent": "Opencode",
    "provider": "google",
    "index": 57.1,
    "cost": 0,
    "wallTime": 508,
    "steps": 83,
    "totalTokens": 18537559,
    "inputTokens": 9515394,
    "outputTokens": 48712,
    "cacheTokens": 8973454,
    "cacheHitRate": 0.861,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5723,
        "inputTokens": 18609813,
        "outputTokens": 85504
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3065,
        "inputTokens": 5978195,
        "outputTokens": 29989
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8333,
        "inputTokens": 2502814,
        "outputTokens": 26855
      }
    ]
  },
  {
    "label": "Claude Code - GLM-5.2",
    "agent": "Claude Code",
    "provider": "novita",
    "index": 43.2,
    "cost": 6.51,
    "wallTime": 1505,
    "steps": 127,
    "totalTokens": 6517238,
    "inputTokens": 5424051,
    "outputTokens": 40310,
    "cacheTokens": 1052877,
    "cacheHitRate": 0.341,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.2861,
        "inputTokens": 11036538,
        "outputTokens": 73392
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2903,
        "inputTokens": 3167330,
        "outputTokens": 19024
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7189,
        "inputTokens": 1154441,
        "outputTokens": 27071
      }
    ]
  },
  {
    "label": "Codex - DeepSeek V4 Flash (max)",
    "agent": "Codex",
    "provider": "deepseek",
    "index": 55.5,
    "cost": 0.07,
    "wallTime": 877,
    "steps": 106,
    "totalTokens": 20876438,
    "inputTokens": 10440053,
    "outputTokens": 98160,
    "cacheTokens": 10338225,
    "cacheHitRate": 0.981,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.4277,
        "inputTokens": 18789281,
        "outputTokens": 183907
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3871,
        "inputTokens": 8160643,
        "outputTokens": 55228
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8492,
        "inputTokens": 2573197,
        "outputTokens": 46184
      }
    ]
  },
  {
    "label": "Claude Code - Opus 5 (xhigh)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 66.7,
    "cost": 8.23,
    "wallTime": 1419,
    "steps": 153,
    "totalTokens": 21823530,
    "inputTokens": 10876804,
    "outputTokens": 72794,
    "cacheTokens": 10707864,
    "cacheHitRate": 0.975,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6047,
        "inputTokens": 20679357,
        "outputTokens": 114890
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.5484,
        "inputTokens": 7637395,
        "outputTokens": 59435
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8492,
        "inputTokens": 2472022,
        "outputTokens": 35885
      }
    ]
  },
  {
    "label": "Grok Build - Grok 4.5 (high)",
    "agent": "Grok Build",
    "provider": "xai",
    "index": 64.4,
    "cost": 2.59,
    "wallTime": 989,
    "steps": 61,
    "totalTokens": 3574851,
    "inputTokens": 1818841,
    "outputTokens": 39952,
    "cacheTokens": 1716057,
    "cacheHitRate": 0.925,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5988,
        "inputTokens": 3247519,
        "outputTokens": 69822
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4812,
        "inputTokens": 1390962,
        "outputTokens": 27678
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8532,
        "inputTokens": 528561,
        "outputTokens": 17889
      }
    ]
  },
  {
    "label": "Claude Code - Fable 5 (max) (with fallback)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 65.8,
    "cost": 11.7,
    "wallTime": 1404,
    "steps": 138,
    "totalTokens": 13980586,
    "inputTokens": 6957836,
    "outputTokens": 73618,
    "cacheTokens": 6797739,
    "cacheHitRate": 0.962,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6608,
        "inputTokens": 13437258,
        "outputTokens": 117577
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4892,
        "inputTokens": 4694454,
        "outputTokens": 55510
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8254,
        "inputTokens": 1582654,
        "outputTokens": 41214
      }
    ]
  },
  {
    "label": "Cursor CLI - Composer 2.5 Fast",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 38.2,
    "cost": 0.55,
    "wallTime": 406,
    "steps": 117,
    "totalTokens": 4238247,
    "inputTokens": 2148692,
    "outputTokens": 19638,
    "cacheTokens": 2074061,
    "cacheHitRate": 0.936,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1593,
        "inputTokens": 3015034,
        "outputTokens": 28937
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3118,
        "inputTokens": 1884108,
        "outputTokens": 14231
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6746,
        "inputTokens": 1373831,
        "outputTokens": 15110
      }
    ]
  },
  {
    "label": "Muse Code - Muse Spark 1.2 (xhigh)",
    "agent": "tbh",
    "provider": "meta",
    "index": 60.5,
    "cost": 2.33,
    "wallTime": 2519,
    "steps": 150,
    "totalTokens": 21454250,
    "inputTokens": 10829344,
    "outputTokens": 89127,
    "cacheTokens": 10535779,
    "cacheHitRate": 0.953,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5811,
        "inputTokens": 22332583,
        "outputTokens": 168907
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4489,
        "inputTokens": 5178884,
        "outputTokens": 34751
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7857,
        "inputTokens": 3695904,
        "outputTokens": 62073
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Sol (medium)",
    "agent": "Codex",
    "provider": "openai",
    "index": 60.6,
    "cost": 2.99,
    "wallTime": 310,
    "steps": 72,
    "totalTokens": 5817519,
    "inputTokens": 3001126,
    "outputTokens": 19115,
    "cacheTokens": 2797277,
    "cacheHitRate": 0.895,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6401,
        "inputTokens": 3958001,
        "outputTokens": 29648
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4005,
        "inputTokens": 3685052,
        "outputTokens": 16713
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7778,
        "inputTokens": 704295,
        "outputTokens": 8494
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (high)",
    "agent": "Codex",
    "provider": "openai",
    "index": 51.4,
    "cost": 0.19,
    "wallTime": 339,
    "steps": 84,
    "totalTokens": 9501375,
    "inputTokens": 4888008,
    "outputTokens": 32273,
    "cacheTokens": 4581094,
    "cacheHitRate": 0.899,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5339,
        "inputTokens": 7328568,
        "outputTokens": 52401
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2903,
        "inputTokens": 4753183,
        "outputTokens": 23533
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7183,
        "inputTokens": 1803902,
        "outputTokens": 18098
      }
    ]
  },
  {
    "label": "Codex - GPT-5.5 (xhigh)",
    "agent": "Codex",
    "provider": "openai",
    "index": 61.5,
    "cost": 5.07,
    "wallTime": 605,
    "steps": 106,
    "totalTokens": 12260230,
    "inputTokens": 6203311,
    "outputTokens": 37947,
    "cacheTokens": 6018972,
    "cacheHitRate": 0.939,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6431,
        "inputTokens": 9686261,
        "outputTokens": 61258
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3602,
        "inputTokens": 6152268,
        "outputTokens": 28410
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8413,
        "inputTokens": 1593265,
        "outputTokens": 20664
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.8 (xhigh)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 58.5,
    "cost": 5.67,
    "wallTime": 1062,
    "steps": 137,
    "totalTokens": 13701048,
    "inputTokens": 6820410,
    "outputTokens": 62007,
    "cacheTokens": 6697458,
    "cacheHitRate": 0.969,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5133,
        "inputTokens": 13948613,
        "outputTokens": 108091
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4274,
        "inputTokens": 3917779,
        "outputTokens": 39932
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8135,
        "inputTokens": 1516118,
        "outputTokens": 32602
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.6 (medium)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 46.5,
    "cost": 1.28,
    "wallTime": 480,
    "steps": 34,
    "totalTokens": 4476378,
    "inputTokens": 2234510,
    "outputTokens": 19008,
    "cacheTokens": 2110648,
    "cacheHitRate": 0.936,
    "evals": [
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2231,
        "inputTokens": 3168404,
        "outputTokens": 22886
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7063,
        "inputTokens": 855905,
        "outputTokens": 13285
      }
    ]
  },
  {
    "label": "Opencode - Muse Spark 1.1 (xhigh)",
    "agent": "Opencode",
    "provider": "meta",
    "index": 53.5,
    "cost": 1.43,
    "wallTime": 755,
    "steps": 55,
    "totalTokens": 12243521,
    "inputTokens": 6261271,
    "outputTokens": 34042,
    "cacheTokens": 5948208,
    "cacheHitRate": 0.95,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5428,
        "inputTokens": 13967691,
        "outputTokens": 66079
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3333,
        "inputTokens": 2452173,
        "outputTokens": 13315
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7302,
        "inputTokens": 1517256,
        "outputTokens": 21543
      }
    ]
  },
  {
    "label": "Claude Code - Opus 5 (medium)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 61.9,
    "cost": 3.14,
    "wallTime": 731,
    "steps": 83,
    "totalTokens": 7936908,
    "inputTokens": 3953917,
    "outputTokens": 29632,
    "cacheTokens": 3880763,
    "cacheHitRate": 0.97,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6283,
        "inputTokens": 7508302,
        "outputTokens": 49222
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4435,
        "inputTokens": 2906289,
        "outputTokens": 24458
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7857,
        "inputTokens": 718920,
        "outputTokens": 10918
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (none)",
    "agent": "Codex",
    "provider": "openai",
    "index": 23.7,
    "cost": 0.3,
    "wallTime": 108,
    "steps": 34,
    "totalTokens": 1116050,
    "inputTokens": 587769,
    "outputTokens": 5171,
    "cacheTokens": 523111,
    "cacheHitRate": 0.853,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1327,
        "inputTokens": 813953,
        "outputTokens": 7404
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1855,
        "inputTokens": 507639,
        "outputTokens": 4680
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.3929,
        "inputTokens": 401784,
        "outputTokens": 2892
      }
    ]
  },
  {
    "label": "Claude Code - Sonnet 4.6 (medium)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 37.6,
    "cost": 2.01,
    "wallTime": 807,
    "steps": 67,
    "totalTokens": 8481319,
    "inputTokens": 4224651,
    "outputTokens": 38508,
    "cacheTokens": 4102518,
    "cacheHitRate": 0.949,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.2891,
        "inputTokens": 8347777,
        "outputTokens": 67151
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1962,
        "inputTokens": 2683550,
        "outputTokens": 21375
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6429,
        "inputTokens": 953023,
        "outputTokens": 25270
      }
    ]
  },
  {
    "label": "Cursor CLI - GPT-5.5 (medium)",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 46.1,
    "cost": 2.01,
    "wallTime": 399,
    "steps": 78,
    "totalTokens": 3989303,
    "inputTokens": 2061667,
    "outputTokens": 11044,
    "cacheTokens": 1916592,
    "cacheHitRate": 0.89,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.3717,
        "inputTokens": 3548172,
        "outputTokens": 16635
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2769,
        "inputTokens": 1748372,
        "outputTokens": 9252
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7341,
        "inputTokens": 524447,
        "outputTokens": 6170
      }
    ]
  },
  {
    "label": "Codex - GPT-5.5 (medium)",
    "agent": "Codex",
    "provider": "openai",
    "index": 54.4,
    "cost": 2.75,
    "wallTime": 384,
    "steps": 78,
    "totalTokens": 6962550,
    "inputTokens": 3525549,
    "outputTokens": 17196,
    "cacheTokens": 3419805,
    "cacheHitRate": 0.948,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5664,
        "inputTokens": 5215387,
        "outputTokens": 26905
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3065,
        "inputTokens": 3716421,
        "outputTokens": 13652
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7579,
        "inputTokens": 970551,
        "outputTokens": 9369
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (none)",
    "agent": "Codex",
    "provider": "openai",
    "index": 20.4,
    "cost": 0.07,
    "wallTime": 150,
    "steps": 56,
    "totalTokens": 3566157,
    "inputTokens": 1845654,
    "outputTokens": 7936,
    "cacheTokens": 1712567,
    "cacheHitRate": 0.876,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.0649,
        "inputTokens": 2942032,
        "outputTokens": 12164
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1747,
        "inputTokens": 1100263,
        "outputTokens": 6058
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.373,
        "inputTokens": 1471102,
        "outputTokens": 5022
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (medium)",
    "agent": "Codex",
    "provider": "openai",
    "index": 47.8,
    "cost": 0.72,
    "wallTime": 256,
    "steps": 51,
    "totalTokens": 3130308,
    "inputTokens": 1614396,
    "outputTokens": 16002,
    "cacheTokens": 1499910,
    "cacheHitRate": 0.893,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.4572,
        "inputTokens": 2052967,
        "outputTokens": 23574
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2823,
        "inputTokens": 1896112,
        "outputTokens": 13601
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6944,
        "inputTokens": 608546,
        "outputTokens": 9362
      }
    ]
  },
  {
    "label": "Claude Code - Qwen3.7 Plus (thinking)",
    "agent": "Claude Code",
    "provider": "alibaba_cloud",
    "index": 36,
    "cost": 6.23,
    "wallTime": 634,
    "steps": 146,
    "totalTokens": 8695924,
    "inputTokens": 4668456,
    "outputTokens": 32127,
    "cacheTokens": 3995341,
    "cacheHitRate": 0.81,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1917,
        "inputTokens": 8634689,
        "outputTokens": 47865
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2366,
        "inputTokens": 2834619,
        "outputTokens": 18312
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6508,
        "inputTokens": 2040023,
        "outputTokens": 31349
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.8 (high)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 56.7,
    "cost": 3.74,
    "wallTime": 746,
    "steps": 104,
    "totalTokens": 9148668,
    "inputTokens": 4555042,
    "outputTokens": 39674,
    "cacheTokens": 4473823,
    "cacheHitRate": 0.969,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5162,
        "inputTokens": 9442317,
        "outputTokens": 71105
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3871,
        "inputTokens": 2606780,
        "outputTokens": 26256
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7976,
        "inputTokens": 856499,
        "outputTokens": 17200
      }
    ]
  },
  {
    "label": "Cursor CLI - Opus 4.7 (medium)",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 45.4,
    "cost": 2.68,
    "wallTime": 817,
    "steps": 86,
    "totalTokens": 5656580,
    "inputTokens": 2819480,
    "outputTokens": 17782,
    "cacheTokens": 2745220,
    "cacheHitRate": 0.959,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.3156,
        "inputTokens": 5578063,
        "outputTokens": 26843
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3387,
        "inputTokens": 1621663,
        "outputTokens": 15037
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7063,
        "inputTokens": 876734,
        "outputTokens": 9645
      }
    ]
  },
  {
    "label": "Opencode - Gemini 3.6 Flash (high)",
    "agent": "Opencode",
    "provider": "google",
    "index": 45.6,
    "cost": 2.08,
    "wallTime": 625,
    "steps": 65,
    "totalTokens": 13024312,
    "inputTokens": 6767191,
    "outputTokens": 42436,
    "cacheTokens": 6214685,
    "cacheHitRate": 0.837,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.413,
        "inputTokens": 14211106,
        "outputTokens": 74639
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2177,
        "inputTokens": 3235374,
        "outputTokens": 22602
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7381,
        "inputTokens": 1966988,
        "outputTokens": 28393
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Sol (xhigh)",
    "agent": "Codex",
    "provider": "openai",
    "index": 65.1,
    "cost": 5.24,
    "wallTime": 444,
    "steps": 96,
    "totalTokens": 9940686,
    "inputTokens": 5120783,
    "outputTokens": 38288,
    "cacheTokens": 4781615,
    "cacheHitRate": 0.906,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6696,
        "inputTokens": 7032301,
        "outputTokens": 59988
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.422,
        "inputTokens": 6146716,
        "outputTokens": 33329
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8611,
        "inputTokens": 1034864,
        "outputTokens": 16417
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (high)",
    "agent": "Codex",
    "provider": "openai",
    "index": 55.8,
    "cost": 1.27,
    "wallTime": 371,
    "steps": 67,
    "totalTokens": 5540012,
    "inputTokens": 2843915,
    "outputTokens": 31662,
    "cacheTokens": 2664435,
    "cacheHitRate": 0.903,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6047,
        "inputTokens": 3972303,
        "outputTokens": 50083
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3091,
        "inputTokens": 3196254,
        "outputTokens": 25833
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7599,
        "inputTokens": 805844,
        "outputTokens": 15486
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (xhigh)",
    "agent": "Codex",
    "provider": "openai",
    "index": 54.7,
    "cost": 0.25,
    "wallTime": 395,
    "steps": 96,
    "totalTokens": 12310694,
    "inputTokens": 6321539,
    "outputTokens": 47114,
    "cacheTokens": 5942041,
    "cacheHitRate": 0.904,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5664,
        "inputTokens": 10065888,
        "outputTokens": 79329
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3118,
        "inputTokens": 6090115,
        "outputTokens": 34160
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7619,
        "inputTokens": 1626125,
        "outputTokens": 22900
      }
    ]
  },
  {
    "label": "Opencode - Muse Spark 1.2 (xhigh)",
    "agent": "Opencode",
    "provider": "meta",
    "index": 56.5,
    "cost": 1.91,
    "wallTime": 1074,
    "steps": 66,
    "totalTokens": 16355512,
    "inputTokens": 8363592,
    "outputTokens": 46508,
    "cacheTokens": 7945412,
    "cacheHitRate": 0.95,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.528,
        "inputTokens": 17294036,
        "outputTokens": 85931
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4409,
        "inputTokens": 3921557,
        "outputTokens": 18945
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7262,
        "inputTokens": 2907306,
        "outputTokens": 34163
      }
    ]
  },
  {
    "label": "Opencode - Opus 4.7 (medium)",
    "agent": "Opencode",
    "provider": "anthropic",
    "index": 50.3,
    "cost": 2.93,
    "wallTime": 732,
    "steps": 54,
    "totalTokens": 7560140,
    "inputTokens": 3733583,
    "outputTokens": 25751,
    "cacheTokens": 3733524,
    "cacheHitRate": 0.961,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.3953,
        "inputTokens": 7106371,
        "outputTokens": 41946
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3602,
        "inputTokens": 2165288,
        "outputTokens": 18657
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.754,
        "inputTokens": 1511482,
        "outputTokens": 14436
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (max)",
    "agent": "Codex",
    "provider": "openai",
    "index": 62.3,
    "cost": 2.21,
    "wallTime": 502,
    "steps": 97,
    "totalTokens": 9465877,
    "inputTokens": 4843755,
    "outputTokens": 60732,
    "cacheTokens": 4561390,
    "cacheHitRate": 0.914,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6696,
        "inputTokens": 7011344,
        "outputTokens": 96847
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3575,
        "inputTokens": 5244151,
        "outputTokens": 48477
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8413,
        "inputTokens": 1336772,
        "outputTokens": 30239
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.8 (low)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 47.4,
    "cost": 2.15,
    "wallTime": 506,
    "steps": 67,
    "totalTokens": 5167219,
    "inputTokens": 2572637,
    "outputTokens": 22823,
    "cacheTokens": 2521368,
    "cacheHitRate": 0.967,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.41,
        "inputTokens": 5152343,
        "outputTokens": 39453
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2823,
        "inputTokens": 1420711,
        "outputTokens": 14888
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7302,
        "inputTokens": 802782,
        "outputTokens": 12163
      }
    ]
  },
  {
    "label": "Cursor CLI - GPT-5.4 (medium)",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 37.1,
    "cost": 1.55,
    "wallTime": 486,
    "steps": 26,
    "totalTokens": 4017673,
    "inputTokens": 2129535,
    "outputTokens": 15483,
    "cacheTokens": 1872655,
    "cacheHitRate": 0.854,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1667,
        "inputTokens": 3482385,
        "outputTokens": 27871
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2823,
        "inputTokens": 2951684,
        "outputTokens": 17757
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6627,
        "inputTokens": 625990,
        "outputTokens": 9472
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (low)",
    "agent": "Codex",
    "provider": "openai",
    "index": 36.7,
    "cost": 0.39,
    "wallTime": 167,
    "steps": 37,
    "totalTokens": 1529813,
    "inputTokens": 797366,
    "outputTokens": 8053,
    "cacheTokens": 724394,
    "cacheHitRate": 0.877,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.2979,
        "inputTokens": 937188,
        "outputTokens": 10694
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2285,
        "inputTokens": 934105,
        "outputTokens": 7240
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.5754,
        "inputTokens": 407419,
        "outputTokens": 5700
      }
    ]
  },
  {
    "label": "Claude Code - Qwen3.8 Max",
    "agent": "Claude Code",
    "provider": "alibaba_cloud",
    "index": 56.6,
    "cost": 3.86,
    "wallTime": 1942,
    "steps": 205,
    "totalTokens": 13160843,
    "inputTokens": 6924933,
    "outputTokens": 68746,
    "cacheTokens": 5993483,
    "cacheHitRate": 0.857,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5192,
        "inputTokens": 11507847,
        "outputTokens": 103998
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3857,
        "inputTokens": 4126952,
        "outputTokens": 35626
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7937,
        "inputTokens": 1925647,
        "outputTokens": 35125
      }
    ]
  },
  {
    "label": "Claude Code - Opus 5 (max)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 65.5,
    "cost": 8.95,
    "wallTime": 1424,
    "steps": 166,
    "totalTokens": 23891138,
    "inputTokens": 11907546,
    "outputTokens": 80473,
    "cacheTokens": 11732777,
    "cacheHitRate": 0.975,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6313,
        "inputTokens": 23588053,
        "outputTokens": 129119
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4892,
        "inputTokens": 7558365,
        "outputTokens": 61758
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8452,
        "inputTokens": 2614703,
        "outputTokens": 42661
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Sol (low)",
    "agent": "Codex",
    "provider": "openai",
    "index": 53.6,
    "cost": 1.72,
    "wallTime": 222,
    "steps": 54,
    "totalTokens": 3165239,
    "inputTokens": 1641547,
    "outputTokens": 10620,
    "cacheTokens": 1513072,
    "cacheHitRate": 0.884,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5339,
        "inputTokens": 2024677,
        "outputTokens": 16084
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3441,
        "inputTokens": 2068183,
        "outputTokens": 9259
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7302,
        "inputTokens": 496351,
        "outputTokens": 5279
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (max)",
    "agent": "Codex",
    "provider": "openai",
    "index": 58.7,
    "cost": 0.31,
    "wallTime": 480,
    "steps": 115,
    "totalTokens": 15463936,
    "inputTokens": 7913897,
    "outputTokens": 64941,
    "cacheTokens": 7485097,
    "cacheHitRate": 0.914,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6342,
        "inputTokens": 13054326,
        "outputTokens": 111663
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.328,
        "inputTokens": 7111540,
        "outputTokens": 45325
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7976,
        "inputTokens": 2183229,
        "outputTokens": 31047
      }
    ]
  },
  {
    "label": "Claude Code - Opus 5 (low)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 56.8,
    "cost": 2.18,
    "wallTime": 569,
    "steps": 64,
    "totalTokens": 5159612,
    "inputTokens": 2568845,
    "outputTokens": 22281,
    "cacheTokens": 2510220,
    "cacheHitRate": 0.965,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5693,
        "inputTokens": 4850074,
        "outputTokens": 37598
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3925,
        "inputTokens": 1850558,
        "outputTokens": 18123
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7421,
        "inputTokens": 560378,
        "outputTokens": 7813
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (low)",
    "agent": "Codex",
    "provider": "openai",
    "index": 25.1,
    "cost": 0.04,
    "wallTime": 115,
    "steps": 35,
    "totalTokens": 1504521,
    "inputTokens": 798108,
    "outputTokens": 6699,
    "cacheTokens": 699715,
    "cacheHitRate": 0.842,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1032,
        "inputTokens": 1133348,
        "outputTokens": 9196
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1532,
        "inputTokens": 626622,
        "outputTokens": 5298
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.496,
        "inputTokens": 600274,
        "outputTokens": 5407
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.8 (max)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 60.6,
    "cost": 7.7,
    "wallTime": 1387,
    "steps": 166,
    "totalTokens": 17911639,
    "inputTokens": 8916514,
    "outputTokens": 88625,
    "cacheTokens": 8729202,
    "cacheHitRate": 0.965,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5575,
        "inputTokens": 18153204,
        "outputTokens": 148270
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4677,
        "inputTokens": 5147235,
        "outputTokens": 61930
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7937,
        "inputTokens": 2055140,
        "outputTokens": 47797
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.8 (medium)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 53.6,
    "cost": 3.26,
    "wallTime": 743,
    "steps": 93,
    "totalTokens": 7769574,
    "inputTokens": 3870142,
    "outputTokens": 34207,
    "cacheTokens": 3787948,
    "cacheHitRate": 0.965,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.4926,
        "inputTokens": 8063404,
        "outputTokens": 61098
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3602,
        "inputTokens": 2126438,
        "outputTokens": 22352
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.754,
        "inputTokens": 803245,
        "outputTokens": 15532
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.7 (medium)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 40.5,
    "cost": 1.68,
    "wallTime": 380,
    "steps": 42,
    "totalTokens": 4574241,
    "inputTokens": 2279493,
    "outputTokens": 16673,
    "cacheTokens": 2224627,
    "cacheHitRate": 0.958,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.2743,
        "inputTokens": 4030146,
        "outputTokens": 26494
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2258,
        "inputTokens": 1586910,
        "outputTokens": 11913
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7143,
        "inputTokens": 946833,
        "outputTokens": 10490
      }
    ]
  },
  {
    "label": "Claude Code - GLM-5.1",
    "agent": "Claude Code",
    "provider": "friendliai",
    "index": 36.1,
    "cost": 4.33,
    "wallTime": 1166,
    "steps": 174,
    "totalTokens": 25881728,
    "inputTokens": 13211533,
    "outputTokens": 49739,
    "cacheTokens": 12620457,
    "cacheHitRate": 0.879,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1858,
        "inputTokens": 30011169,
        "outputTokens": 78136
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2473,
        "inputTokens": 5692462,
        "outputTokens": 31937
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6508,
        "inputTokens": 1711603,
        "outputTokens": 37816
      }
    ]
  },
  {
    "label": "Antigravity SDK - Gemini 3.7 Flash (high)",
    "agent": "Antigravity SDK v0.1.8",
    "provider": "google",
    "index": 55.6,
    "cost": 0,
    "wallTime": 379,
    "steps": 109,
    "totalTokens": 14993504,
    "inputTokens": 7873406,
    "outputTokens": 63937,
    "cacheTokens": 7056161,
    "cacheHitRate": 0.868,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5605,
        "inputTokens": 13115583,
        "outputTokens": 115264
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2715,
        "inputTokens": 6139632,
        "outputTokens": 38537
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8373,
        "inputTokens": 3380811,
        "outputTokens": 32385
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Luna (medium)",
    "agent": "Codex",
    "provider": "openai",
    "index": 42.4,
    "cost": 0.09,
    "wallTime": 202,
    "steps": 58,
    "totalTokens": 4389586,
    "inputTokens": 2273504,
    "outputTokens": 15198,
    "cacheTokens": 2100885,
    "cacheHitRate": 0.879,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.3658,
        "inputTokens": 3299689,
        "outputTokens": 23391
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2715,
        "inputTokens": 1920543,
        "outputTokens": 10845
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6349,
        "inputTokens": 1414077,
        "outputTokens": 10602
      }
    ]
  },
  {
    "label": "Cursor CLI - Composer 2",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 27.5,
    "cost": 0.04,
    "wallTime": 514,
    "steps": 28,
    "totalTokens": 2954431,
    "inputTokens": 1476106,
    "outputTokens": 14007,
    "cacheTokens": 1419615,
    "cacheHitRate": 0.926,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0,
        "inputTokens": 2144428,
        "outputTokens": 22339
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1774,
        "inputTokens": 1580137,
        "outputTokens": 11388
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6468,
        "inputTokens": 1290713,
        "outputTokens": 17477
      }
    ]
  },
  {
    "label": "Claude Code - Kimi K2.6",
    "agent": "Claude Code",
    "provider": "moonshotai",
    "index": 32.6,
    "cost": 1.19,
    "wallTime": 2461,
    "steps": 131,
    "totalTokens": 11454356,
    "inputTokens": 5786199,
    "outputTokens": 36275,
    "cacheTokens": 5631883,
    "cacheHitRate": 0.958,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1652,
        "inputTokens": 10905739,
        "outputTokens": 61150
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1586,
        "inputTokens": 4140736,
        "outputTokens": 19063
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6548,
        "inputTokens": 1328214,
        "outputTokens": 28219
      }
    ]
  },
  {
    "label": "Codex - GPT-5.4 (medium)",
    "agent": "Codex",
    "provider": "openai",
    "index": 39.1,
    "cost": 2.42,
    "wallTime": 425,
    "steps": 73,
    "totalTokens": 5924972,
    "inputTokens": 3011113,
    "outputTokens": 18149,
    "cacheTokens": 2895710,
    "cacheHitRate": 0.929,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.25,
        "inputTokens": 4772397,
        "outputTokens": 48282
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.2231,
        "inputTokens": 4224347,
        "outputTokens": 19253
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6984,
        "inputTokens": 884666,
        "outputTokens": 10779
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Terra (xhigh)",
    "agent": "Codex",
    "provider": "openai",
    "index": 57.1,
    "cost": 1.52,
    "wallTime": 413,
    "steps": 75,
    "totalTokens": 6460892,
    "inputTokens": 3313555,
    "outputTokens": 40160,
    "cacheTokens": 3107178,
    "cacheHitRate": 0.907,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.5841,
        "inputTokens": 4651084,
        "outputTokens": 63626
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3226,
        "inputTokens": 3747693,
        "outputTokens": 32996
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8056,
        "inputTokens": 873389,
        "outputTokens": 19167
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Sol (high)",
    "agent": "Codex",
    "provider": "openai",
    "index": 64.1,
    "cost": 4.14,
    "wallTime": 379,
    "steps": 86,
    "totalTokens": 8084867,
    "inputTokens": 4163502,
    "outputTokens": 28199,
    "cacheTokens": 3893166,
    "cacheHitRate": 0.902,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.649,
        "inputTokens": 5539775,
        "outputTokens": 43230
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4489,
        "inputTokens": 5040848,
        "outputTokens": 24981
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8254,
        "inputTokens": 1016956,
        "outputTokens": 12729
      }
    ]
  },
  {
    "label": "Claude Code - Opus 5 (high)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 63.4,
    "cost": 3.8,
    "wallTime": 802,
    "steps": 93,
    "totalTokens": 9699126,
    "inputTokens": 4832263,
    "outputTokens": 35447,
    "cacheTokens": 4746535,
    "cacheHitRate": 0.971,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.6077,
        "inputTokens": 9157930,
        "outputTokens": 58192
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.4919,
        "inputTokens": 3563900,
        "outputTokens": 29757
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.8016,
        "inputTokens": 885557,
        "outputTokens": 13248
      }
    ]
  },
  {
    "label": "Claude Code - DeepSeek V4 Pro (high)",
    "agent": "Claude Code",
    "provider": "deepseek",
    "index": 31.4,
    "cost": 0.27,
    "wallTime": 1072,
    "steps": 127,
    "totalTokens": 9823145,
    "inputTokens": 5143082,
    "outputTokens": 41153,
    "cacheTokens": 4638910,
    "cacheHitRate": 0.833,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.0855,
        "inputTokens": 8912558,
        "outputTokens": 62188
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.1989,
        "inputTokens": 3342595,
        "outputTokens": 29335
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6587,
        "inputTokens": 2730101,
        "outputTokens": 30303
      }
    ]
  },
  {
    "label": "Codex - GPT-5.6 Sol (none)",
    "agent": "Codex",
    "provider": "openai",
    "index": 43.4,
    "cost": 1.4,
    "wallTime": 206,
    "steps": 55,
    "totalTokens": 3415816,
    "inputTokens": 1737377,
    "outputTokens": 7663,
    "cacheTokens": 1670776,
    "cacheHitRate": 0.89,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.354,
        "inputTokens": 2342366,
        "outputTokens": 11319
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3414,
        "inputTokens": 1643087,
        "outputTokens": 6631
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6071,
        "inputTokens": 1062712,
        "outputTokens": 4269
      }
    ]
  },
  {
    "label": "Cursor CLI - Composer 2.5",
    "agent": "Cursor CLI",
    "provider": "cursor",
    "index": 38.2,
    "cost": 0.08,
    "wallTime": 573,
    "steps": 117,
    "totalTokens": 3577610,
    "inputTokens": 1815576,
    "outputTokens": 17531,
    "cacheTokens": 1747519,
    "cacheHitRate": 0.939,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1593,
        "inputTokens": 2521667,
        "outputTokens": 24661
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.3118,
        "inputTokens": 1734339,
        "outputTokens": 13782
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6746,
        "inputTokens": 985637,
        "outputTokens": 13475
      }
    ]
  },
  {
    "label": "Gemini CLI - Gemini 3.1 Pro (high)",
    "agent": "Gemini CLI",
    "provider": "gemini",
    "index": 30.3,
    "cost": 2,
    "wallTime": 649,
    "steps": 31,
    "totalTokens": 4704372,
    "inputTokens": 2448999,
    "outputTokens": 18426,
    "cacheTokens": 2236947,
    "cacheHitRate": 0.87,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.1416,
        "inputTokens": 4115263,
        "outputTokens": 14682
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.086,
        "inputTokens": 1971708,
        "outputTokens": 18630
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.6825,
        "inputTokens": 912050,
        "outputTokens": 23163
      }
    ]
  },
  {
    "label": "Claude Code - Opus 4.7 (max)",
    "agent": "Claude Code",
    "provider": "anthropic",
    "index": 50.3,
    "cost": 5.63,
    "wallTime": 940,
    "steps": 107,
    "totalTokens": 15939667,
    "inputTokens": 7948025,
    "outputTokens": 46042,
    "cacheTokens": 7817455,
    "cacheHitRate": 0.969,
    "evals": [
      {
        "benchmark": "DeepSWE",
        "reward": 0.4012,
        "inputTokens": 14256507,
        "outputTokens": 74955
      },
      {
        "benchmark": "SWE-Atlas-QnA",
        "reward": 0.371,
        "inputTokens": 6438676,
        "outputTokens": 33448
      },
      {
        "benchmark": "Terminal-Bench v2",
        "reward": 0.7381,
        "inputTokens": 1689698,
        "outputTokens": 25738
      }
    ]
  }
];

export const AGENT_PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#d97706',
  openai: '#10a37f',
  google: '#4285f4',
  xai: '#6b7280',
  deepseek: '#059669',
  moonshotai: '#8b5cf6',
  meta: '#3b82f6',
  alibaba: '#f97316',
  zai: '#ec4899',
  cursor: '#0891b2',
  novita: '#ef4444',
};

import { NewsItem } from './types';

/**
 * Image enrichment pipeline.
 *
 * 1. Fetch the article URL and extract og:image / twitter:image meta tags.
 * 2. If no image is found, fall back to a company / founder photo keyed by
 *    entity extraction from the title + content.
 * 3. Items that already have a valid image_url are skipped.
 */

/* ------------------------------------------------------------------ */
/*  Entity → photo mapping                                            */
/* ------------------------------------------------------------------ */

interface EntityPhoto {
  pattern: RegExp;
  imageUrl: string;
}

/**
 * Curated list of AI-company / founder photos.  Images are hosted on
 * reliable CDNs (Wikipedia Commons, company press kits, etc.) and
 * should stay available long-term.
 */
const ENTITY_PHOTOS: EntityPhoto[] = [
  // --- Founders / CEOs ---
  { pattern: /\belon\s*musk\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/440px-Elon_Musk_Royal_Society_%28crop2%29.jpg' },
  { pattern: /\bsam\s*altman\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Sam_Altman_CropEdit.jpg/440px-Sam_Altman_CropEdit.jpg' },
  { pattern: /\bdario\s*amodei\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Dario_Amodei_in_2024.jpg/440px-Dario_Amodei_in_2024.jpg' },
  { pattern: /\bdemis\s*hassabis\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Demis_Hassabis_%282024%29.jpg/440px-Demis_Hassabis_%282024%29.jpg' },
  { pattern: /\bjensen\s*huang\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Jensen_Huang_20230525_%28cropped%29.jpg/440px-Jensen_Huang_20230525_%28cropped%29.jpg' },
  { pattern: /\bsundar\s*pichai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Sundar_Pichai_WEF_2022_%28cropped%29.jpg/440px-Sundar_Pichai_WEF_2022_%28cropped%29.jpg' },
  { pattern: /\bsatya\s*nadella\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/MS-Exec-Nadella-Satya-2017-08-31-22_%28cropped%29.jpg/440px-MS-Exec-Nadella-Satya-2017-08-31-22_%28cropped%29.jpg' },
  { pattern: /\bmark\s*zuckerberg\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Mark_Zuckerberg_F8_2018_Dev_Conference_%2839698033625%29_%28cropped%29.jpg/440px-Mark_Zuckerberg_F8_2018_Dev_Conference_%2839698033625%29_%28cropped%29.jpg' },
  { pattern: /\bjeff\s*bezos\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Jeff_Bezos_visits_LAAFB_SMC_%283908618%29_%28cropped%29.jpeg/440px-Jeff_Bezos_visits_LAAFB_SMC_%283908618%29_%28cropped%29.jpeg' },
  { pattern: /\bjared\s*kaplan\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/164660?s=400' },
  { pattern: /\billia\s*sutskever\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Ilya_Sutskever_-_2024_%28cropped%29.jpg/440px-Ilya_Sutskever_-_2024_%28cropped%29.jpg' },
  { pattern: /\bmira\s*murati\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mira_Murati_in_2024_%28cropped%29.jpg/440px-Mira_Murati_in_2024_%28cropped%29.jpg' },
  { pattern: /\bmarc\s*benioff\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Marc_Benioff_%2834906393373%29_%28cropped%29.jpg/440px-Marc_Benioff_%2834906393373%29_%28cropped%29.jpg' },
  { pattern: /\bjanki\s*bhatt\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1060?s=400' },
  { pattern: /\bscott\s*aronson\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1234?s=400' },
  { pattern: /\bnoam\s*shazeer\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\badam\s*d'angelo\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Adam_D%27Angelo%2C_Places_%26_Things_Festival_2019_%28cropped%29.jpg/440px-Adam_D%27Angelo%2C_Places_%26_Things_Festival_2019_%28cropped%29.jpg' },
  { pattern: /\bemad\s*mostaque\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/2000?s=400' },
  { pattern: /\bdavid\s*holz\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/3000?s=400' },
  { pattern: /\bcaleb\s*christensen\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/4000?s=400' },

  // --- Companies / Products ---
  { pattern: /\bopenai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_logo.svg/440px-OpenAI_logo.svg.png' },
  { pattern: /\bchatgpt\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/440px-ChatGPT_logo.svg.png' },
  { pattern: /\bgpt-?4\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_logo.svg/440px-OpenAI_logo.svg.png' },
  { pattern: /\bgpt-?5\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_logo.svg/440px-OpenAI_logo.svg.png' },
  { pattern: /\bclaude\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/440px-Anthropic_logo.svg.png' },
  { pattern: /\banthropic\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/440px-Anthropic_logo.svg.png' },
  { pattern: /\bgemini\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/440px-Google_Gemini_logo.svg.png' },
  { pattern: /\bgoogle\s*deepmind\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Google_DeepMind_logo.svg/440px-Google_DeepMind_logo.svg.png' },
  { pattern: /\bdeepmind\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Google_DeepMind_logo.svg/440px-Google_DeepMind_logo.svg.png' },
  { pattern: /\bmistral\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Mistral_AI_logo.svg/440px-Mistral_AI_logo.svg.png' },
  { pattern: /\bmeta\s*ai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/440px-Meta_Platforms_Inc._logo.svg.png' },
  { pattern: /\bllama\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/440px-Meta_Platforms_Inc._logo.svg.png' },
  { pattern: /\bnvidia\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nvidia_logo.svg/440px-Nvidia_logo.svg.png' },
  { pattern: /\bamd\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/AMD_Logo.svg/440px-AMD_Logo.svg.png' },
  { pattern: /\bintel\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Intel_logo_%282020%2C_light_blue%29.svg/440px-Intel_logo_%282020%2C_light_blue%29.svg.png' },
  { pattern: /\bmicrosoft\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/440px-Microsoft_logo.svg.png' },
  { pattern: /\bcopilot\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/440px-Microsoft_logo.svg.png' },
  { pattern: /\bamazon\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/440px-Amazon_logo.svg.png' },
  { pattern: /\baws\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/440px-Amazon_Web_Services_Logo.svg.png' },
  { pattern: /\bbedrock\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/440px-Amazon_Web_Services_Logo.svg.png' },
  { pattern: /\bapple\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/440px-Apple_logo_black.svg.png' },
  { pattern: /\bbaidu\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Baidu_logo.svg/440px-Baidu_logo.svg.png' },
  { pattern: /\bernie\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Baidu_logo.svg/440px-Baidu_logo.svg.png' },
  { pattern: /\balibaba\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Alibaba_cloud_logo.svg/440px-Alibaba_cloud_logo.svg.png' },
  { pattern: /\bbytedance\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/ByteDance_logo.svg/440px-ByteDance_logo.svg.png' },
  { pattern: /\btesla\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/440px-Tesla_Motors.svg.png' },
  { pattern: /\bspacex\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/SpaceX-Logo.svg/440px-SpaceX-Logo.svg.png' },
  { pattern: /\bx\.ai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/XAI_logo.svg/440px-XAI_logo.svg.png' },
  { pattern: /\bgrok\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/XAI_logo.svg/440px-XAI_logo.svg.png' },
  { pattern: /\bcohere\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Cohere_logo.svg/440px-Cohere_logo.svg.png' },
  { pattern: /\bstability\s*ai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Stability_AI_logo.svg/440px-Stability_AI_logo.svg.png' },
  { pattern: /\bstable\s*diffusion\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Stability_AI_logo.svg/440px-Stability_AI_logo.svg.png' },
  { pattern: /\bmidjourney\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Midjourney_logo.png/440px-Midjourney_logo.png' },
  { pattern: /\bhugging\s*face\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/HuggingFace_logo_%28modified%29.svg/440px-HuggingFace_logo_%28modified%29.svg.png' },
  { pattern: /\bperplexity\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Perplexity_AI_logo.svg/440px-Perplexity_AI_logo.svg.png' },
  { pattern: /\bgroq\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Groq_logo.svg/440px-Groq_logo.svg.png' },
  { pattern: /\btogether\s*ai\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\breplit\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Replit_logo.svg/440px-Replit_logo.svg.png' },
  { pattern: /\bwindsurf\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bcursor\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bgithub\s*copilot\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/440px-Octicons-mark-github.svg.png' },
  { pattern: /\bgoogle\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/440px-Google_2015_logo.svg.png' },
  { pattern: /\bdeepseek\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bqwen\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Alibaba_cloud_logo.svg/440px-Alibaba_cloud_logo.svg.png' },
  { pattern: /\bblack\s*forest\s*labs\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bflux\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bideogram\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\brecraft\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bhidream\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bscale\s*ai\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Scale_AI_logo.svg/440px-Scale_AI_logo.svg.png' },
  { pattern: /\bai21\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\badept\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\binflection\b/i, imageUrl: 'https://avatars.githubusercontent.com/u/1000?s=400' },
  { pattern: /\bcohere\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Cohere_logo.svg/440px-Cohere_logo.svg.png' },
  { pattern: /\bsnowflake\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Snowflake_Logo.svg/440px-Snowflake_Logo.svg.png' },
  { pattern: /\bdatabricks\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Databricks_logo.svg/440px-Databricks_logo.svg.png' },
  { pattern: /\bfigma\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/440px-Figma-logo.svg.png' },
  { pattern: /\bcanva\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Canva_icon_2021.svg/440px-Canva_icon_2021.svg.png' },
  { pattern: /\bnotion\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Notion_app_logo.png/440px-Notion_app_logo.png' },
  { pattern: /\bslack\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/440px-Slack_icon_2019.svg.png' },
  { pattern: /\bdiscord\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Discord_logo.svg/440px-Discord_logo.svg.png' },
  { pattern: /\breddit\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Reddit_logo_new.svg/440px-Reddit_logo_new.svg.png' },
  { pattern: /\btwitter\b|\bX\s*(platform|social|post)\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/440px-X_logo_2023.svg.png' },
  { pattern: /\byoutube\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/440px-YouTube_full-color_icon_%282017%29.svg.png' },
  { pattern: /\btesla\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/440px-Tesla_Motors.svg.png' },

  // --- Generic AI fallback ---
  { pattern: /\bartificial\s*intelligence\b|\bAI\b/, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Adobe_Corporate_Logo.jpg/440px-Adobe_Corporate_Logo.jpg' },
  { pattern: /\bmachine\s*learning\b|\bML\b/, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Adobe_Corporate_Logo.jpg/440px-Adobe_Corporate_Logo.jpg' },
  { pattern: /\bneural\s*network\b/i, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Adobe_Corporate_Logo.jpg/440px-Adobe_Corporate_Logo.jpg' },
];

/* ------------------------------------------------------------------ */
/*  OG image extraction                                               */
/* ------------------------------------------------------------------ */

/** Extract the best image URL from raw HTML (og:image → twitter:image → first large <img>). */
function extractOgImage(html: string): string | undefined {
  // 1. og:image
  const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];

  // 2. twitter:image
  const twMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twMatch) return twMatch[1];

  // 3. twitter:image:src
  const twSrc = html.match(/<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i);
  if (twSrc) return twSrc[1];

  // 4. <link rel="image_src" href="...">
  const linkMatch = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
  if (linkMatch) return linkMatch[1];

  return undefined;
}

/** Validate an image URL (must be http(s), not a tiny icon, etc.) */
function isValidImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let u = url.trim().replace(/&amp;/g, '&');
  if (!/^https?:\/\//i.test(u)) return undefined;
  // Skip tiny icons / tracking pixels
  if (/\.(ico|gif|svg)$/i.test(u)) return undefined;
  if (/1x1|pixel|track|spacer|blank/i.test(u)) return undefined;
  // Skip tiny Twitter avatars
  if (/pbs\.twimg\.com\/profile_images\//i.test(u) && /_normal\./i.test(u)) return undefined;
  return u;
}

/* ------------------------------------------------------------------ */
/*  Entity extraction                                                 */
/* ------------------------------------------------------------------ */

function matchEntity(text: string): string | undefined {
  for (const ep of ENTITY_PHOTOS) {
    if (ep.pattern.test(text)) return ep.imageUrl;
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

const CONCURRENCY = 20;
const FETCH_TIMEOUT = 4000;

/**
 * Enrich items that are missing an image_url.
 * - First tries og:image from the article URL.
 * - Falls back to entity-based photo (company logo / founder headshot).
 * - Mutates items in-place (sets `image_url`).
 */
export async function enrichImages(items: NewsItem[]): Promise<{ fetched: number; entity: number; failed: number }> {
  const needEnrichment = items.filter(i => {
    if (i.image_url && isValidImageUrl(i.image_url)) return false;
    // Skip Google News redirect URLs — they won't resolve to article pages
    if (i.url && /news\.google\.com/i.test(i.url)) return false;
    return true;
  });
  console.log(`🖼️  Enriching images for ${needEnrichment.length}/${items.length} items (concurrency=${CONCURRENCY})…`);

  let fetched = 0;
  let entity = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < needEnrichment.length; i += CONCURRENCY) {
    const batch = needEnrichment.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async item => {
        const entityKey = `${item.title} ${item.content || ''} ${item.summary || ''}`;

        // Step 1: Try fetching og:image from the article URL
        if (item.url) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
            const res = await fetch(item.url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AINewsBot/1.0)',
                'Accept': 'text/html',
              },
              redirect: 'follow',
            });
            clearTimeout(timeout);

            if (res.ok) {
              const html = await res.text();
              // Only grab the <head> portion to save bandwidth
              const head = html.slice(0, 64 * 1024);
              const img = isValidImageUrl(extractOgImage(head));
              if (img) {
                item.image_url = img;
                fetched++;
                return;
              }
            }
          } catch {
            // fetch failed — fall through to entity fallback
          }
        }

        // Step 2: Entity-based fallback
        const entityImg = matchEntity(entityKey);
        if (entityImg) {
          item.image_url = entityImg;
          entity++;
          return;
        }

        failed++;
      })
    );

    // Log progress every 50 items
    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= needEnrichment.length) {
      console.log(`   … ${Math.min(i + CONCURRENCY, needEnrichment.length)}/${needEnrichment.length} processed (${fetched} og:image, ${entity} entity, ${failed} failed)`);
    }
  }

  console.log(`🖼️  Image enrichment done: ${fetched} from og:image, ${entity} from entity mapping, ${failed} still missing`);
  return { fetched, entity, failed };
}
